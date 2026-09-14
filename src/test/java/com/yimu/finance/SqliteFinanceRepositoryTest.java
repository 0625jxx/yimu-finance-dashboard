package com.yimu.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

final class SqliteFinanceRepositoryTest {
    @TempDir
    Path tempDirectory;

    @Test
    void initializesRequiredRelationalTables() throws Exception {
        Path database = tempDirectory.resolve("finance.db");
        repository(database);

        assertTrue(Files.isRegularFile(database));
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database);
             ResultSet tables = connection.createStatement().executeQuery(
                     "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")) {
            var names = new java.util.HashSet<String>();
            while (tables.next()) names.add(tables.getString(1));
            assertTrue(names.containsAll(List.of(
                    "accounts", "transactions", "budgets", "goals", "import_batches", "app_meta")));
        }
    }

    @Test
    void persistsAndReloadsNormalizedFinanceState() throws Exception {
        Path database = tempDirectory.resolve("finance.db");
        Object repository = repository(database);
        Map<String, Object> state = Map.of(
                "accounts", List.of(Map.of(
                        "id", "cash", "name", "现金", "type", "cash", "kind", "asset",
                        "openingBalanceCents", 100_000)),
                "transactions", List.of(
                        Map.of("id", "t2", "type", "income", "amountCents", 50_000, "date", "2026-09-09",
                                "accountId", "cash", "category", "工资", "source", "import", "importBatchId", "b1"),
                        Map.of("id", "t1", "type", "expense", "amountCents", 2_850, "date", "2026-09-08",
                                "accountId", "cash", "category", "餐饮", "merchant", "咖啡店", "source", "manual")),
                "budgets", List.of(Map.of("month", "2026-09", "category", "餐饮", "limitCents", 50_000)),
                "goals", List.of(Map.of(
                        "id", "g1", "name", "旅行基金", "currentCents", 10_000,
                        "targetCents", 100_000, "targetDate", "2027-06-01")),
                "importBatches", List.of(Map.of(
                        "id", "b1", "fileName", "九月账单.csv", "createdAt", "2026-09-10T10:00:00Z",
                        "transactionCount", 1, "status", "active")));

        repository.getClass().getMethod("saveState", Map.class).invoke(repository, state);
        Object reloaded = repository(database);

        assertTrue((Boolean) reloaded.getClass().getMethod("isInitialized").invoke(reloaded));
        @SuppressWarnings("unchecked")
        Map<String, Object> loaded = (Map<String, Object>) reloaded.getClass().getMethod("loadState").invoke(reloaded);
        assertEquals(state, loaded);
        assertFalse(loaded.containsKey("rawJson"));
    }

    private static Object repository(Path database) throws Exception {
        Class<?> type = Class.forName("com.yimu.finance.SqliteFinanceRepository");
        return type.getConstructor(Path.class).newInstance(database);
    }
}
