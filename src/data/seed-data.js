export const seedData = {
  accounts: [
    { id: "salary-card", name: "工资卡", type: "银行卡", kind: "asset", openingBalanceCents: 146_820_00, color: "blue" },
    { id: "wechat", name: "微信钱包", type: "第三方支付", kind: "asset", openingBalanceCents: 3_280_00, color: "green" },
    { id: "cash", name: "现金", type: "现金", kind: "asset", openingBalanceCents: 860_00, color: "sand" },
    { id: "credit-card", name: "日常信用卡", type: "信用卡", kind: "liability", openingBalanceCents: 6_420_00, color: "orange" },
  ],
  transactions: [
    { id: "t1", type: "expense", amountCents: 26_800, accountId: "credit-card", date: "2026-09-14", category: "购物", merchant: "无印良品", note: "收纳用品", source: "manual" },
    { id: "t2", type: "expense", amountCents: 3_650, accountId: "wechat", date: "2026-09-14", category: "餐饮", merchant: "林记面馆", note: "午餐", source: "manual" },
    { id: "t3", type: "expense", amountCents: 12_900, accountId: "salary-card", date: "2026-09-13", category: "交通", merchant: "中石化", note: "加油", source: "import" },
    { id: "t4", type: "expense", amountCents: 18_000, accountId: "credit-card", date: "2026-09-12", category: "娱乐", merchant: "城市剧场", note: "演出票", source: "manual" },
    { id: "t5", type: "expense", amountCents: 4_280, accountId: "wechat", date: "2026-09-11", category: "餐饮", merchant: "小满咖啡", note: "", source: "manual" },
    { id: "t6", type: "income", amountCents: 1_850_000, accountId: "salary-card", date: "2026-09-10", category: "工资", merchant: "九月工资", note: "", source: "manual" },
    { id: "t7", type: "expense", amountCents: 320_000, accountId: "salary-card", date: "2026-09-08", category: "居住", merchant: "房租", note: "九月房租", source: "manual" },
    { id: "t8", type: "transfer", amountCents: 280_000, accountId: "salary-card", targetAccountId: "credit-card", date: "2026-09-07", category: "转账", merchant: "信用卡还款", note: "", source: "manual" },
    { id: "t9", type: "expense", amountCents: 8_800, accountId: "credit-card", date: "2026-09-06", category: "医疗", merchant: "社区药房", note: "", source: "import" },
    { id: "t10", type: "expense", amountCents: 6_200, accountId: "wechat", date: "2026-09-05", category: "餐饮", merchant: "好味道", note: "晚餐", source: "manual" },
    { id: "t11", type: "expense", amountCents: 7_500, accountId: "credit-card", date: "2026-09-03", category: "交通", merchant: "滴滴出行", note: "", source: "manual" },
    { id: "t12", type: "income", amountCents: 86_000, accountId: "wechat", date: "2026-09-02", category: "其他", merchant: "项目报销", note: "", source: "manual" },
  ],
  budgets: [
    { month: "2026-09", category: "餐饮", limitCents: 90_000 },
    { month: "2026-09", category: "交通", limitCents: 55_000 },
    { month: "2026-09", category: "购物", limitCents: 35_000 },
    { month: "2026-09", category: "娱乐", limitCents: 20_000 },
  ],
  goals: [
    { id: "g1", name: "应急备用金", currentCents: 68_000_00, targetCents: 100_000_00, targetDate: "2027-02-01" },
  ],
};
