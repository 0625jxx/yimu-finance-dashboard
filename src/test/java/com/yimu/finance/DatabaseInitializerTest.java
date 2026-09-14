package com.yimu.finance;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

final class DatabaseInitializerTest {
    @TempDir
    Path tempDirectory;

    @Test
    void commandCreatesAReadyToSubmitSqliteDatabase() throws Exception {
        Path database = tempDirectory.resolve("deliverable.db");
        Class<?> initializer = Class.forName("com.yimu.finance.DatabaseInitializer");
        initializer.getMethod("main", String[].class).invoke(null, (Object) new String[] { database.toString() });

        assertTrue(Files.size(database) > 10_000);
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database);
             ResultSet result = connection.createStatement().executeQuery("PRAGMA foreign_key_check")) {
            assertTrue(!result.next());
        }
    }
}
