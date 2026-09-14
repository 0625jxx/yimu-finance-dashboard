package com.yimu.finance;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class SqliteFinanceRepository {
    private static final String INITIALIZED_KEY = "initialized";
    private final Path databasePath;

    public SqliteFinanceRepository(Path databasePath) throws IOException, SQLException {
        this.databasePath = databasePath.toAbsolutePath().normalize();
        Path parent = this.databasePath.getParent();
        if (parent != null) Files.createDirectories(parent);
        initializeSchema();
    }

    public Path databasePath() {
        return databasePath;
    }

    public boolean isInitialized() throws SQLException {
        try (Connection connection = connect();
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT meta_value FROM app_meta WHERE meta_key = ?")) {
            statement.setString(1, INITIALIZED_KEY);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() && "true".equals(result.getString(1));
            }
        }
    }

    public Map<String, Object> loadState() throws SQLException {
        try (Connection connection = connect()) {
            Map<String, Object> state = new LinkedHashMap<>();
            state.put("accounts", loadAccounts(connection));
            state.put("transactions", loadTransactions(connection));
            state.put("budgets", loadBudgets(connection));
            state.put("goals", loadGoals(connection));
            state.put("importBatches", loadImportBatches(connection));
            return state;
        }
    }

    public void saveState(Map<String, Object> state) throws SQLException {
        try (Connection connection = connect()) {
            connection.setAutoCommit(false);
            try {
                clearTables(connection);
                insertImportBatches(connection, records(state, "importBatches"));
                insertAccounts(connection, records(state, "accounts"));
                insertTransactions(connection, records(state, "transactions"));
                insertBudgets(connection, records(state, "budgets"));
                insertGoals(connection, records(state, "goals"));
                try (PreparedStatement statement = connection.prepareStatement(
                        "INSERT INTO app_meta(meta_key, meta_value) VALUES(?, ?) "
                                + "ON CONFLICT(meta_key) DO UPDATE SET meta_value=excluded.meta_value")) {
                    statement.setString(1, INITIALIZED_KEY);
                    statement.setString(2, "true");
                    statement.executeUpdate();
                }
                connection.commit();
            } catch (SQLException | RuntimeException error) {
                connection.rollback();
                throw error;
            } finally {
                connection.setAutoCommit(true);
            }
        }
    }

    private Connection connect() throws SQLException {
        Connection connection = DriverManager.getConnection("jdbc:sqlite:" + databasePath);
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
        }
        return connection;
    }

    private void initializeSchema() throws IOException, SQLException {
        String schema;
        try (InputStream input = SqliteFinanceRepository.class.getResourceAsStream("/db/schema.sql")) {
            if (input == null) throw new IOException("缺少数据库结构资源 /db/schema.sql");
            schema = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        try (Connection connection = connect(); Statement statement = connection.createStatement()) {
            for (String sql : schema.split(";")) {
                String command = sql.trim();
                if (!command.isEmpty()) statement.execute(command);
            }
        }
    }

    private static void clearTables(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("DELETE FROM transactions");
            statement.executeUpdate("DELETE FROM budgets");
            statement.executeUpdate("DELETE FROM goals");
            statement.executeUpdate("DELETE FROM accounts");
            statement.executeUpdate("DELETE FROM import_batches");
        }
    }

    private static void insertAccounts(Connection connection, List<Map<String, Object>> rows) throws SQLException {
        String sql = "INSERT INTO accounts(account_id,name,account_type,kind,opening_balance_cents,currency,included_in_net_worth,status) VALUES(?,?,?,?,?,?,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (Map<String, Object> row : rows) {
                statement.setString(1, text(row, "id"));
                statement.setString(2, text(row, "name"));
                statement.setString(3, optionalText(row, "type"));
                statement.setString(4, text(row, "kind"));
                statement.setLong(5, number(row, "openingBalanceCents"));
                statement.setString(6, optionalText(row, "currency"));
                setOptionalBoolean(statement, 7, row.get("includedInNetWorth"));
                statement.setString(8, optionalText(row, "status"));
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertImportBatches(Connection connection, List<Map<String, Object>> rows) throws SQLException {
        String sql = "INSERT INTO import_batches(batch_id,file_name,created_at,transaction_count,status,undone_at) VALUES(?,?,?,?,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (Map<String, Object> row : rows) {
                statement.setString(1, text(row, "id"));
                statement.setString(2, optionalText(row, "fileName"));
                statement.setString(3, optionalText(row, "createdAt"));
                statement.setLong(4, number(row, "transactionCount"));
                statement.setString(5, row.getOrDefault("status", "active").toString());
                statement.setString(6, optionalText(row, "undoneAt"));
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertTransactions(Connection connection, List<Map<String, Object>> rows) throws SQLException {
        String sql = "INSERT INTO transactions(transaction_id,transaction_type,amount_cents,delta_cents,transaction_date,account_id,target_account_id,category,merchant,note,source,import_batch_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (Map<String, Object> row : rows) {
                statement.setString(1, text(row, "id"));
                statement.setString(2, text(row, "type"));
                statement.setLong(3, number(row, "amountCents"));
                setOptionalLong(statement, 4, row.get("deltaCents"));
                statement.setString(5, text(row, "date"));
                statement.setString(6, text(row, "accountId"));
                statement.setString(7, optionalText(row, "targetAccountId"));
                statement.setString(8, text(row, "category"));
                statement.setString(9, optionalText(row, "merchant"));
                statement.setString(10, optionalText(row, "note"));
                statement.setString(11, row.getOrDefault("source", "manual").toString());
                statement.setString(12, optionalText(row, "importBatchId"));
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertBudgets(Connection connection, List<Map<String, Object>> rows) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO budgets(budget_month,category,limit_cents) VALUES(?,?,?)")) {
            for (Map<String, Object> row : rows) {
                statement.setString(1, text(row, "month"));
                statement.setString(2, text(row, "category"));
                statement.setLong(3, number(row, "limitCents"));
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void insertGoals(Connection connection, List<Map<String, Object>> rows) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO goals(goal_id,name,current_cents,target_cents,target_date,goal_type) VALUES(?,?,?,?,?,?)")) {
            for (Map<String, Object> row : rows) {
                statement.setString(1, text(row, "id"));
                statement.setString(2, text(row, "name"));
                statement.setLong(3, number(row, "currentCents"));
                statement.setLong(4, number(row, "targetCents"));
                statement.setString(5, optionalText(row, "targetDate"));
                statement.setString(6, optionalText(row, "type"));
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static List<Map<String, Object>> loadAccounts(Connection connection) throws SQLException {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (ResultSet result = connection.createStatement().executeQuery("SELECT * FROM accounts ORDER BY rowid")) {
            while (result.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", result.getString("account_id"));
                row.put("name", result.getString("name"));
                put(row, "type", result.getString("account_type"));
                row.put("kind", result.getString("kind"));
                row.put("openingBalanceCents", result.getInt("opening_balance_cents"));
                put(row, "currency", result.getString("currency"));
                Object included = result.getObject("included_in_net_worth");
                if (included != null) row.put("includedInNetWorth", result.getInt("included_in_net_worth") != 0);
                put(row, "status", result.getString("status"));
                rows.add(row);
            }
        }
        return rows;
    }

    private static List<Map<String, Object>> loadImportBatches(Connection connection) throws SQLException {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (ResultSet result = connection.createStatement().executeQuery("SELECT * FROM import_batches ORDER BY rowid")) {
            while (result.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", result.getString("batch_id"));
                put(row, "fileName", result.getString("file_name"));
                put(row, "createdAt", result.getString("created_at"));
                row.put("transactionCount", result.getInt("transaction_count"));
                row.put("status", result.getString("status"));
                put(row, "undoneAt", result.getString("undone_at"));
                rows.add(row);
            }
        }
        return rows;
    }

    private static List<Map<String, Object>> loadTransactions(Connection connection) throws SQLException {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (ResultSet result = connection.createStatement().executeQuery("SELECT * FROM transactions ORDER BY rowid")) {
            while (result.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", result.getString("transaction_id"));
                row.put("type", result.getString("transaction_type"));
                row.put("amountCents", result.getInt("amount_cents"));
                Object delta = result.getObject("delta_cents");
                if (delta != null) row.put("deltaCents", result.getInt("delta_cents"));
                row.put("date", result.getString("transaction_date"));
                row.put("accountId", result.getString("account_id"));
                put(row, "targetAccountId", result.getString("target_account_id"));
                row.put("category", result.getString("category"));
                put(row, "merchant", result.getString("merchant"));
                put(row, "note", result.getString("note"));
                row.put("source", result.getString("source"));
                put(row, "importBatchId", result.getString("import_batch_id"));
                rows.add(row);
            }
        }
        return rows;
    }

    private static List<Map<String, Object>> loadBudgets(Connection connection) throws SQLException {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (ResultSet result = connection.createStatement().executeQuery("SELECT * FROM budgets ORDER BY rowid")) {
            while (result.next()) {
                rows.add(new LinkedHashMap<>(Map.of(
                        "month", result.getString("budget_month"),
                        "category", result.getString("category"),
                        "limitCents", result.getInt("limit_cents"))));
            }
        }
        return rows;
    }

    private static List<Map<String, Object>> loadGoals(Connection connection) throws SQLException {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (ResultSet result = connection.createStatement().executeQuery("SELECT * FROM goals ORDER BY rowid")) {
            while (result.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", result.getString("goal_id"));
                row.put("name", result.getString("name"));
                row.put("currentCents", result.getInt("current_cents"));
                row.put("targetCents", result.getInt("target_cents"));
                put(row, "targetDate", result.getString("target_date"));
                put(row, "type", result.getString("goal_type"));
                rows.add(row);
            }
        }
        return rows;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> records(Map<String, Object> state, String key) {
        Object value = state.get(key);
        if (value == null) return List.of();
        if (!(value instanceof List<?> list)) throw new IllegalArgumentException(key + " 必须是数组");
        return list.stream().map(item -> {
            if (!(item instanceof Map<?, ?> map)) throw new IllegalArgumentException(key + " 元素必须是对象");
            return (Map<String, Object>) map;
        }).toList();
    }

    private static String text(Map<String, Object> row, String key) {
        Object value = row.get(key);
        if (value == null || value.toString().isBlank()) throw new IllegalArgumentException(key + " 不能为空");
        return value.toString();
    }

    private static String optionalText(Map<String, Object> row, String key) {
        Object value = row.get(key);
        return value == null || value.toString().isBlank() ? null : value.toString();
    }

    private static long number(Map<String, Object> row, String key) {
        Object value = row.get(key);
        if (!(value instanceof Number number)) throw new IllegalArgumentException(key + " 必须是数字");
        return number.longValue();
    }

    private static void setOptionalLong(PreparedStatement statement, int index, Object value) throws SQLException {
        if (value instanceof Number number) statement.setLong(index, number.longValue());
        else statement.setObject(index, null);
    }

    private static void setOptionalBoolean(PreparedStatement statement, int index, Object value) throws SQLException {
        if (value instanceof Boolean booleanValue) statement.setInt(index, booleanValue ? 1 : 0);
        else statement.setObject(index, null);
    }

    private static void put(Map<String, Object> row, String key, Object value) {
        if (value != null) row.put(key, value);
    }
}
