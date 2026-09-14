import test from "node:test";
import assert from "node:assert/strict";

import {
  budgetProgress,
  calculateAccountBalance,
  calculateSummary,
  createFinanceStore,
  findDuplicateTransactions,
  parseTransactionCsv,
} from "../src/model/finance-model.js";

const accounts = [
  { id: "cash", kind: "asset", openingBalanceCents: 100_000 },
  { id: "card", kind: "liability", openingBalanceCents: 20_000 },
];

const transactions = [
  { id: "salary", type: "income", amountCents: 500_000, accountId: "cash", date: "2026-09-01", category: "工资" },
  { id: "food", type: "expense", amountCents: 8_000, accountId: "cash", date: "2026-09-03", category: "餐饮" },
  { id: "card-food", type: "expense", amountCents: 3_000, accountId: "card", date: "2026-09-04", category: "餐饮" },
  { id: "repay", type: "transfer", amountCents: 5_000, accountId: "cash", targetAccountId: "card", date: "2026-09-05", category: "转账" },
];

test("资产账户余额按收入、支出和转出更新", () => {
  assert.equal(calculateAccountBalance(accounts[0], transactions), 587_000);
});

test("负债账户余额因消费增加并因还款减少", () => {
  assert.equal(calculateAccountBalance(accounts[1], transactions), 18_000);
});

test("月度汇总排除转账并正确计算净资产", () => {
  assert.deepEqual(calculateSummary(accounts, transactions, "2026-09"), {
    assetsCents: 587_000,
    liabilitiesCents: 18_000,
    netWorthCents: 569_000,
    incomeCents: 500_000,
    expenseCents: 11_000,
    netCashFlowCents: 489_000,
    savingsRate: 0.978,
  });
});

test("无收入时结余率为 null，而不是无穷或 NaN", () => {
  const summary = calculateSummary(accounts, transactions, "2026-08");
  assert.equal(summary.savingsRate, null);
});

test("预算使用率在 80% 和 100% 分界处进入正确状态", () => {
  assert.equal(budgetProgress(7_999, 10_000).status, "normal");
  assert.equal(budgetProgress(8_000, 10_000).status, "warning");
  assert.equal(budgetProgress(10_000, 10_000).status, "over");
  assert.equal(budgetProgress(1_000, 0).status, "unset");
});

test("CSV 解析支持带引号的商户并以元转为整数分", () => {
  const csv = "日期,类型,金额,账户,分类,商户,备注\n2026-09-08,支出,28.50,现金,餐饮,\"好味道,一店\",午餐";
  const [row] = parseTransactionCsv(csv);
  assert.equal(row.amountCents, 2_850);
  assert.equal(row.type, "expense");
  assert.equal(row.merchant, "好味道,一店");
});

test("CSV 解析拒绝超过 2MB 的文件内容", () => {
  assert.throws(() => parseTransactionCsv("x".repeat(2 * 1024 * 1024 + 1)), /不能超过 2MB/);
});

test("重复识别以日期、金额、账户和商户组合判断", () => {
  const existing = [{ id: "old", date: "2026-09-08", amountCents: 2_850, accountId: "cash", merchant: "便利店" }];
  const incoming = [
    { id: "same", date: "2026-09-08", amountCents: 2_850, accountId: "cash", merchant: "便利店" },
    { id: "different", date: "2026-09-08", amountCents: 2_850, accountId: "cash", merchant: "咖啡店" },
  ];
  assert.deepEqual(findDuplicateTransactions(existing, incoming), ["same"]);
});

test("数据仓库在新增交易后通知观察者且拒绝零金额", () => {
  const store = createFinanceStore({ accounts, transactions: [], budgets: [] });
  const events = [];
  const unsubscribe = store.subscribe((state, event) => events.push([state.transactions.length, event]));

  store.addTransaction({ type: "expense", amountCents: 1_200, accountId: "cash", date: "2026-09-09", category: "交通" });
  unsubscribe();
  store.addTransaction({ type: "income", amountCents: 3_000, accountId: "cash", date: "2026-09-10", category: "其他收入" });

  assert.deepEqual(events, [[1, "transaction:added"]]);
  assert.throws(
    () => store.addTransaction({ type: "expense", amountCents: 0, accountId: "cash", date: "2026-09-11", category: "餐饮" }),
    /金额必须大于 0/,
  );
});

test("数据仓库拒绝写入不存在的账户", () => {
  const store = createFinanceStore({ accounts, transactions: [], budgets: [] });
  assert.throws(
    () => store.addTransaction({ type: "expense", amountCents: 100, accountId: "missing", date: "2026-09-11", category: "餐饮" }),
    /账户不存在/,
  );
});

test("编辑交易保留标识并发布更新事件", () => {
  const store = createFinanceStore({ accounts, transactions: [transactions[1]], budgets: [] });
  const events = [];
  store.subscribe((state, event) => events.push([state.transactions[0].amountCents, event]));

  store.updateTransaction("food", { ...transactions[1], amountCents: 9_900, note: "聚餐" });

  assert.equal(store.getState().transactions[0].id, "food");
  assert.deepEqual(events, [[9_900, "transaction:updated"]]);
});

test("编辑不存在的交易时拒绝静默创建", () => {
  const store = createFinanceStore({ accounts, transactions: [], budgets: [] });
  assert.throws(() => store.updateTransaction("missing", { amountCents: 100 }), /交易不存在/);
});

test("导入批次记录来源并可整批撤销", () => {
  const store = createFinanceStore({ accounts, transactions: [], budgets: [], importBatches: [] });
  store.importTransactions(
    [
      { id: "import-1", type: "expense", amountCents: 2_000, accountId: "cash", date: "2026-09-08", category: "餐饮" },
      { id: "import-2", type: "expense", amountCents: 3_000, accountId: "cash", date: "2026-09-09", category: "交通" },
    ],
    { id: "batch-1", fileName: "九月账单.csv", createdAt: "2026-09-14T10:00:00.000Z" },
  );

  assert.equal(store.getState().transactions[0].importBatchId, "batch-1");
  assert.equal(store.getState().importBatches[0].transactionCount, 2);

  store.undoImportBatch("batch-1");
  assert.equal(store.getState().transactions.length, 0);
  assert.equal(store.getState().importBatches[0].status, "undone");
});

test("目标可新增和更新，目标金额必须大于零", () => {
  const store = createFinanceStore({ accounts, transactions: [], budgets: [], goals: [] });
  store.saveGoal({ id: "goal-1", name: "旅行基金", currentCents: 10_000, targetCents: 50_000, targetDate: "2026-12-31" });
  store.saveGoal({ id: "goal-1", name: "旅行基金", currentCents: 20_000, targetCents: 50_000, targetDate: "2026-12-31" });

  assert.equal(store.getState().goals.length, 1);
  assert.equal(store.getState().goals[0].currentCents, 20_000);
  assert.throws(() => store.saveGoal({ name: "无效目标", currentCents: 0, targetCents: 0 }), /目标金额必须大于 0/);
});

test("删除目标只影响指定目标", () => {
  const store = createFinanceStore({ accounts, transactions: [], budgets: [], goals: [
    { id: "goal-1", name: "旅行", currentCents: 0, targetCents: 10_000 },
    { id: "goal-2", name: "应急金", currentCents: 0, targetCents: 20_000 },
  ] });
  store.removeGoal("goal-1");
  assert.deepEqual(store.getState().goals.map(({ id }) => id), ["goal-2"]);
});
