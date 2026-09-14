package com.yimu.finance;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.SQLException;
import java.util.Map;
import java.util.Set;

public final class FinanceHttpServer implements AutoCloseable {
    private static final int MAX_STATE_BYTES = 2 * 1024 * 1024;
    private static final Set<String> STATIC_METHODS = Set.of("GET", "HEAD");
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Map<String, String> CONTENT_TYPES = Map.of(
            ".html", "text/html; charset=utf-8", ".css", "text/css; charset=utf-8",
            ".js", "text/javascript; charset=utf-8", ".json", "application/json; charset=utf-8");

    private final HttpServer server;
    private final SqliteFinanceRepository repository;

    public FinanceHttpServer(Path databasePath, int port) throws IOException, SQLException {
        repository = new SqliteFinanceRepository(databasePath);
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), port), 0);
        server.createContext("/api/state", this::handleStateApi);
        server.createContext("/", this::serveStaticFile);
    }

    public void start() { server.start(); }
    public int port() { return server.getAddress().getPort(); }
    public Path databasePath() { return repository.databasePath(); }
    @Override public void close() { server.stop(0); }

    private void handleStateApi(HttpExchange exchange) throws IOException {
        addSecurityHeaders(exchange.getResponseHeaders());
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        try {
            switch (exchange.getRequestMethod()) {
                case "GET" -> sendJson(exchange, 200, Map.of(
                        "initialized", repository.isInitialized(), "state", repository.loadState()));
                case "PUT" -> saveState(exchange);
                default -> {
                    exchange.getResponseHeaders().set("Allow", "GET, PUT");
                    sendJson(exchange, 405, Map.of("error", "仅支持 GET 和 PUT 请求"));
                }
            }
        } catch (BodyTooLargeException error) {
            sendJson(exchange, 413, Map.of("error", "数据不能超过 2MB"));
        } catch (IllegalArgumentException error) {
            sendJson(exchange, 400, Map.of("error", error.getMessage()));
        } catch (SQLException error) {
            sendJson(exchange, 500, Map.of("error", "数据库操作失败"));
        }
    }

    private void saveState(HttpExchange exchange) throws IOException, SQLException, BodyTooLargeException {
        byte[] body = readLimited(exchange.getRequestBody());
        Map<String, Object> state = JSON.readValue(body, new TypeReference<>() {});
        for (String key : Set.of("accounts", "transactions", "budgets", "goals", "importBatches")) {
            if (!(state.get(key) instanceof java.util.List<?>)) {
                throw new IllegalArgumentException(key + " 必须是数组");
            }
        }
        repository.saveState(state);
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
    }

    private void serveStaticFile(HttpExchange exchange) throws IOException {
        Headers headers = exchange.getResponseHeaders();
        addSecurityHeaders(headers);
        String method = exchange.getRequestMethod();
        if (!STATIC_METHODS.contains(method)) {
            headers.set("Allow", "GET, HEAD");
            send(exchange, 405, "仅支持 GET 和 HEAD 请求".getBytes(StandardCharsets.UTF_8), method);
            return;
        }
        String path = exchange.getRequestURI().getPath();
        if ("/".equals(path)) path = "/index.html";
        if (!isSafePath(path)) {
            send(exchange, 404, "页面不存在".getBytes(StandardCharsets.UTF_8), method);
            return;
        }
        try (InputStream input = FinanceHttpServer.class.getResourceAsStream("/web" + path)) {
            if (input == null) {
                send(exchange, 404, "页面不存在".getBytes(StandardCharsets.UTF_8), method);
                return;
            }
            byte[] body = input.readAllBytes();
            headers.set("Content-Type", contentType(path));
            send(exchange, 200, body, method);
        }
    }

    private static byte[] readLimited(InputStream input) throws IOException, BodyTooLargeException {
        byte[] body = input.readNBytes(MAX_STATE_BYTES + 1);
        if (body.length > MAX_STATE_BYTES) throw new BodyTooLargeException();
        return body;
    }

    private static boolean isSafePath(String path) {
        if (path.indexOf('\0') >= 0 || path.contains("\\")) return false;
        for (String segment : path.split("/")) {
            if ("..".equals(segment) || segment.startsWith(".")) return false;
        }
        return path.endsWith(".html") || path.endsWith(".css")
                || path.endsWith(".js") || path.endsWith(".json");
    }

    private static String contentType(String path) {
        return CONTENT_TYPES.entrySet().stream().filter(entry -> path.endsWith(entry.getKey()))
                .map(Map.Entry::getValue).findFirst().orElse("application/octet-stream");
    }

    private static void addSecurityHeaders(Headers headers) {
        headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
        headers.set("Referrer-Policy", "no-referrer");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Frame-Options", "DENY");
        headers.set("Cache-Control", "no-store");
    }

    private static void sendJson(HttpExchange exchange, int status, Object value) throws IOException {
        send(exchange, status, JSON.writeValueAsBytes(value), exchange.getRequestMethod());
    }

    private static void send(HttpExchange exchange, int status, byte[] body, String method) throws IOException {
        exchange.sendResponseHeaders(status, "HEAD".equals(method) ? -1 : body.length);
        if (!"HEAD".equals(method)) exchange.getResponseBody().write(body);
        exchange.close();
    }

    private static final class BodyTooLargeException extends Exception { }
}
