package com.yimu.finance;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;

/** 可执行 JAR 入口：只在本机提供打包后的 Web 应用。 */
public final class Main {
    private static final int DEFAULT_PORT = 4173;
    private static final Set<String> ALLOWED_METHODS = Set.of("GET", "HEAD");
    private static final Map<String, String> CONTENT_TYPES = Map.of(
            ".html", "text/html; charset=utf-8",
            ".css", "text/css; charset=utf-8",
            ".js", "text/javascript; charset=utf-8",
            ".json", "application/json; charset=utf-8"
    );

    private Main() {
    }

    public static void main(String[] args) throws IOException {
        int port = readPort();
        HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), port), 0);
        server.createContext("/", Main::serveStaticFile);
        server.start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> server.stop(0)));
        System.out.printf("一目个人财务看板已启动：http://127.0.0.1:%d/%n", port);
        System.out.println("按 Ctrl+C 停止程序。数据仅保存在当前浏览器中。");
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

    private static void serveStaticFile(HttpExchange exchange) throws IOException {
        Headers headers = exchange.getResponseHeaders();
        addSecurityHeaders(headers);
        String method = exchange.getRequestMethod();
        if (!ALLOWED_METHODS.contains(method)) {
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

        String resource = "/web" + path;
        try (InputStream input = Main.class.getResourceAsStream(resource)) {
            if (input == null) {
                send(exchange, 404, "页面不存在".getBytes(StandardCharsets.UTF_8), method);
                return;
            }
            byte[] body = input.readAllBytes();
            headers.set("Content-Type", contentType(path));
            send(exchange, 200, body, method);
        }
    }

    private static boolean isSafePath(String path) {
        if (path.indexOf('\0') >= 0 || path.contains("\\")) return false;
        for (String segment : path.split("/")) {
            if ("..".equals(segment) || segment.startsWith(".")) return false;
        }
        return path.endsWith(".html") || path.endsWith(".css") || path.endsWith(".js") || path.endsWith(".json");
    }

    private static String contentType(String path) {
        return CONTENT_TYPES.entrySet().stream()
                .filter(entry -> path.endsWith(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse("application/octet-stream");
    }

    private static void addSecurityHeaders(Headers headers) {
        headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
        headers.set("Referrer-Policy", "no-referrer");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Frame-Options", "DENY");
        headers.set("Cache-Control", "no-store");
    }

    private static void send(HttpExchange exchange, int status, byte[] body, String method) throws IOException {
        exchange.sendResponseHeaders(status, "HEAD".equals(method) ? -1 : body.length);
        if (!"HEAD".equals(method)) exchange.getResponseBody().write(body);
        exchange.close();
    }
}
