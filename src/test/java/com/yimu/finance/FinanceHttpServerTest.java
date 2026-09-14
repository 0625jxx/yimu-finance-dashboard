package com.yimu.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

final class FinanceHttpServerTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    @TempDir
    Path tempDirectory;

    @Test
    void apiPersistsStateInSqliteAcrossServerRestart() throws Exception {
        Path database = tempDirectory.resolve("api.db");
        Map<String, Object> state = Map.of(
                "accounts", List.of(Map.of(
                        "id", "cash", "name", "现金", "type", "cash", "kind", "asset",
                        "openingBalanceCents", 100_000)),
                "transactions", List.of(), "budgets", List.of(), "goals", List.of(), "importBatches", List.of());

        Object first = startServer(database);
        int firstPort = port(first);
        try {
            Map<String, Object> initial = getState(firstPort);
            assertFalse((Boolean) initial.get("initialized"));

            HttpResponse<String> saved = request(firstPort, "PUT", JSON.writeValueAsString(state));
            assertEquals(204, saved.statusCode());
        } finally {
            stop(first);
        }

        Object second = startServer(database);
        try {
            Map<String, Object> response = getState(port(second));
            assertTrue((Boolean) response.get("initialized"));
            assertEquals(state, response.get("state"));
        } finally {
            stop(second);
        }
    }

    @Test
    void apiRejectsUnsupportedMethodsAndOversizedBodies() throws Exception {
        Object server = startServer(tempDirectory.resolve("limits.db"));
        int port = port(server);
        try {
            assertEquals(405, request(port, "POST", "{}").statusCode());
            assertEquals(413, request(port, "PUT", "x".repeat(2 * 1024 * 1024 + 1)).statusCode());
        } finally {
            stop(server);
        }
    }

    private static Object startServer(Path database) throws Exception {
        Class<?> type = Class.forName("com.yimu.finance.FinanceHttpServer");
        Object server = type.getConstructor(Path.class, int.class).newInstance(database, 0);
        type.getMethod("start").invoke(server);
        return server;
    }

    private static int port(Object server) throws Exception {
        return (Integer) server.getClass().getMethod("port").invoke(server);
    }

    private static void stop(Object server) throws Exception {
        server.getClass().getMethod("close").invoke(server);
    }

    private static Map<String, Object> getState(int port) throws Exception {
        HttpResponse<String> response = request(port, "GET", null);
        assertEquals(200, response.statusCode());
        return JSON.readValue(response.body(), new TypeReference<>() {});
    }

    private static HttpResponse<String> request(int port, String method, String body) throws Exception {
        HttpRequest.BodyPublisher publisher = body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/state"))
                .method(method, publisher)
                .header("Content-Type", "application/json")
                .build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }
}
