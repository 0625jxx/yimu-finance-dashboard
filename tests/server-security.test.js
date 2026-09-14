import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { resolveStaticPath } from "../scripts/server-path.js";

const root = resolve("C:/safe/project");

test("静态服务器把普通请求限制在项目根目录", () => {
  assert.equal(resolveStaticPath(root, "/src/app.js?version=1"), resolve(root, "src/app.js"));
});

test("静态服务器拒绝编码和未编码的路径穿越", () => {
  assert.equal(resolveStaticPath(root, "/../secret.txt"), null);
  assert.equal(resolveStaticPath(root, "/%2e%2e/%2e%2e/secret.txt"), null);
});

test("静态服务器不暴露 Git 等隐藏目录", () => {
  assert.equal(resolveStaticPath(root, "/.git/config"), null);
  assert.equal(resolveStaticPath(root, "/docs/.private.txt"), null);
});
