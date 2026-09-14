package com.yimu.finance;

import java.nio.file.Path;

/** 创建包含完整关系表结构的 SQLite 提交数据库，不覆盖已有业务数据。 */
public final class DatabaseInitializer {
    private DatabaseInitializer() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1 || args[0].isBlank()) {
            throw new IllegalArgumentException("用法：DatabaseInitializer <database-path>");
        }
        SqliteFinanceRepository repository = new SqliteFinanceRepository(Path.of(args[0]));
        System.out.printf("SQLite 数据库已就绪：%s%n", repository.databasePath());
    }
}
