package com.yimu.finance;

import java.io.IOException;
import java.nio.file.Path;
import java.sql.SQLException;

/** 可执行 JAR 入口：在本机提供 Web 应用和 SQLite 数据接口。 */
public final class Main {
    private static final int DEFAULT_PORT = 4173;

    private Main() {
    }

    public static void main(String[] args) throws IOException, SQLException {
        int port = readPort();
        FinanceHttpServer server = new FinanceHttpServer(readDatabasePath(), port);
        server.start();
        Runtime.getRuntime().addShutdownHook(new Thread(server::close));
        System.out.printf("一目个人财务看板已启动：http://127.0.0.1:%d/%n", port);
        System.out.printf("SQLite 数据库：%s%n", server.databasePath());
        System.out.println("按 Ctrl+C 停止程序。");
    }

    private static int readPort() {
        String configured = System.getenv("PORT");
        if (configured == null || configured.isBlank()) return DEFAULT_PORT;
        try {
            int port = Integer.parseInt(configured);
            return port > 0 && port <= 65535 ? port : DEFAULT_PORT;
        } catch (NumberFormatException ignored) {
            return DEFAULT_PORT;
        }
    }

    private static Path readDatabasePath() {
        String configured = System.getenv("YIMU_DB_PATH");
        return configured == null || configured.isBlank()
                ? Path.of("data", "yimu-finance-dashboard.db")
                : Path.of(configured);
    }
}
