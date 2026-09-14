import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("应用入口显式连接 Model、View 和 Controller", async () => {
  const source = await read("../src/app.js");
  assert.match(source, /createFinanceStore/);
  assert.match(source, /DashboardView/);
  assert.match(source, /AppController/);
});

test("主页面包含看板、交易、账户、预算和目标五个核心视图", async () => {
  const html = await read("../index.html");
  for (const page of ["dashboard", "transactions", "accounts", "budgets", "goals"]) {
    assert.match(html, new RegExp(`data-page=["']${page}["']`));
  }
});

test("高影响和录入操作使用可访问的原生对话框与明确标签", async () => {
  const html = await read("../index.html");
  assert.match(html, /<dialog[^>]+id="transaction-dialog"/);
  assert.match(html, /<dialog[^>]+id="account-dialog"/);
  assert.match(html, /<dialog[^>]+id="budget-dialog"/);
  assert.match(html, /<dialog[^>]+id="goal-dialog"/);
  assert.match(html, /aria-label="隐藏全部金额"/);
});

test("样式包含移动布局、键盘焦点和减少动态效果支持", async () => {
  const css = await read("../styles.css");
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
