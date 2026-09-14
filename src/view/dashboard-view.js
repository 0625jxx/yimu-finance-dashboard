import { budgetProgress, calculateAccountBalance, calculateSummary } from "../model/finance-model.js";

const currency = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" });
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character]));
const money = (cents) => currency.format(cents / 100);
const typeLabels = { expense: "支出", income: "收入", transfer: "转账", adjustment: "调整" };
const categoryIcons = { 餐饮: "餐", 交通: "行", 居住: "住", 购物: "购", 娱乐: "乐", 医疗: "医", 工资: "薪", 其他: "·", 转账: "转" };
const pageTitles = { dashboard: "财务概览", transactions: "交易明细", accounts: "账户", budgets: "月度预算" };

const createChart = (transactions, month) => {
  const days = Array.from({ length: 30 }, (_, index) => index + 1);
  let income = 0;
  let expense = 0;
  const points = days.map((day) => {
    transactions.filter(({ date }) => date === `${month}-${String(day).padStart(2, "0")}`).forEach((transaction) => {
      if (transaction.type === "income") income += transaction.amountCents;
      if (transaction.type === "expense") expense += transaction.amountCents;
    });
    return { day, income, expense };
  });
  const max = Math.max(...points.flatMap((point) => [point.income, point.expense]), 1);
  const x = (day) => 18 + ((day - 1) / 29) * 564;
  const y = (value) => 178 - (value / max) * 148;
  const path = (key) => points.map((point, index) => `${index ? "L" : "M"}${x(point.day).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");
  return `
    <svg class="flow-chart" viewBox="0 0 600 205" role="img" aria-labelledby="flow-chart-title">
      <title id="flow-chart-title">本月累计收入与支出走势</title>
      <defs><linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#167b68" stop-opacity=".18"/><stop offset="1" stop-color="#167b68" stop-opacity="0"/></linearGradient></defs>
      <line class="chart-grid" x1="18" y1="30" x2="582" y2="30"/><line class="chart-grid" x1="18" y1="104" x2="582" y2="104"/><line class="chart-grid" x1="18" y1="178" x2="582" y2="178"/>
      <path class="area-fill" d="${path("income")} L582,178 L18,178 Z"/><path class="income-line" d="${path("income")}"/><path class="expense-line" d="${path("expense")}"/>
      <text class="axis-label" x="18" y="199">1日</text><text class="axis-label" x="286" y="199">15日</text><text class="axis-label" x="557" y="199">30日</text>
    </svg>`;
};

export class DashboardView {
  constructor(documentRef) {
    this.document = documentRef;
    this.body = documentRef.body;
    this.dashboard = documentRef.querySelector("#dashboard-content");
    this.transactions = documentRef.querySelector("#transaction-list");
    this.accounts = documentRef.querySelector("#account-list");
    this.budgets = documentRef.querySelector("#budget-list");
    this.toastTimer = null;
    documentRef.querySelector("#today-label").textContent = dateFormat.format(new Date());
  }

  render(state, ui) {
    this.document.querySelectorAll("[data-page]").forEach((page) => {
      const active = page.dataset.page === ui.route;
      page.hidden = !active;
      page.classList.toggle("is-active", active);
    });
    this.document.querySelectorAll("[data-route]").forEach((item) => item.classList.toggle("is-active", item.dataset.route === ui.route));
    this.document.querySelector("#page-title").textContent = pageTitles[ui.route];
    this.document.querySelector("#month-picker").value = ui.month;
    this.body.classList.toggle("amounts-hidden", ui.hideAmounts);
    const privacyButton = this.document.querySelector("[data-action='toggle-privacy']");
    privacyButton.setAttribute("aria-pressed", String(ui.hideAmounts));
    privacyButton.setAttribute("aria-label", ui.hideAmounts ? "显示全部金额" : "隐藏全部金额");

    this.renderDashboard(state, ui.month);
    this.renderTransactions(state, ui);
    this.renderAccounts(state);
    this.renderBudgets(state, ui.month);
    this.syncAccountSelects(state.accounts);
  }

  renderDashboard(state, month) {
    const summary = calculateSummary(state.accounts, state.transactions, month);
    const monthTransactions = state.transactions.filter(({ date }) => date.startsWith(month));
    const expenses = monthTransactions.filter(({ type }) => type === "expense");
    const accountById = new Map(state.accounts.map((account) => [account.id, account]));
    const goal = state.goals?.[0];
    const goalRatio = goal ? Math.min(goal.currentCents / goal.targetCents, 1) : 0;
    const budgets = state.budgets.filter((budget) => budget.month === month);
    const budgetRows = budgets.map((budget) => {
      const spent = expenses.filter(({ category }) => category === budget.category).reduce((sum, transaction) => sum + transaction.amountCents, 0);
      const progress = budgetProgress(spent, budget.limitCents);
      return `<div><div class="budget-label"><strong>${escapeHtml(budget.category)}</strong><span data-money>${money(spent)} / ${money(budget.limitCents)}</span></div><div class="progress-track"><div class="progress-fill ${progress.status}" style="width:${Math.min(progress.ratio * 100, 100)}%"></div></div></div>`;
    }).join("");
    const recentRows = this.transactionRows(monthTransactions.slice(0, 5), accountById, false);
    const accountRows = state.accounts.map((account) => `<div class="account-mini"><div><i class="account-color ${escapeHtml(account.color)}"></i><span>${escapeHtml(account.name)}<small>${escapeHtml(account.type)}</small></span></div><strong data-money>${money(calculateAccountBalance(account, state.transactions))}</strong></div>`).join("");

    this.dashboard.innerHTML = `
      <div class="dashboard-grid">
        <div class="dashboard-main">
          <article class="panel overview-panel">
            <div class="overview-head"><div><p>当前净资产</p><div class="net-worth" data-money>${money(summary.netWorthCents)}</div><span class="net-change">本月净现金流 ${summary.netCashFlowCents >= 0 ? "+" : ""}${money(summary.netCashFlowCents)}</span></div></div>
            <div class="metric-strip">
              <div class="metric-item"><span>本月收入</span><strong data-money>${money(summary.incomeCents)}</strong></div>
              <div class="metric-item"><span>本月支出</span><strong data-money>${money(summary.expenseCents)}</strong></div>
              <div class="metric-item"><span>结余率</span><strong>${summary.savingsRate === null ? "不适用" : `${(summary.savingsRate * 100).toFixed(1)}%`}</strong></div>
            </div>
          </article>
          <article class="panel flow-panel">
            <div class="panel-title-row"><div><h3>本月资金轨迹</h3><p>累计值，转账不计入收支</p></div><div class="chart-legend"><span><i class="income-dot"></i>收入</span><span><i class="expense-dot"></i>支出</span></div></div>
            ${createChart(monthTransactions, month)}
          </article>
          <article class="panel ledger-panel">
            <div class="panel-title-row"><div><h3>最近交易</h3><p>每个数字都能回到它的来源</p></div><button class="link-button" type="button" data-route="transactions">查看全部</button></div>
            <div class="transaction-rows">${recentRows || '<div class="empty-state"><strong>本月还没有交易</strong>点击“记一笔”开始记录。</div>'}</div>
          </article>
        </div>
        <aside class="dashboard-side">
          <article class="panel budget-panel"><div class="panel-title-row"><div><h3>预算节奏</h3><p>${budgets.length} 个分类预算</p></div><button class="link-button" type="button" data-route="budgets">管理</button></div><div class="budget-stack">${budgetRows || '<div class="empty-state"><strong>还没有预算</strong>设置预算后可跟踪本月节奏。</div>'}</div></article>
          <article class="panel goal-panel"><div class="panel-title-row"><div><h3>优先目标</h3><p>${goal ? `计划于 ${escapeHtml(goal.targetDate)} 完成` : "尚未设置目标"}</p></div></div>${goal ? `<div class="goal-ring" style="--goal-progress:${goalRatio * 100}%"><div><strong>${Math.round(goalRatio * 100)}%</strong><span>已完成</span></div></div><div class="goal-caption"><strong>${escapeHtml(goal.name)}</strong><span data-money>${money(goal.currentCents)} / ${money(goal.targetCents)}</span></div>` : ""}</article>
          <article class="panel account-summary"><div class="panel-title-row"><div><h3>账户余额</h3><p>${state.accounts.length} 个账户</p></div><button class="link-button" type="button" data-route="accounts">查看</button></div><div class="account-mini-list">${accountRows}</div></article>
        </aside>
      </div>`;
  }

  transactionRows(transactions, accountById, allowDelete) {
    return transactions.map((transaction) => {
      const account = accountById.get(transaction.accountId);
      const isIncome = transaction.type === "income";
      const sign = isIncome ? "+" : transaction.type === "expense" ? "−" : "";
      return `<div class="transaction-row"><span class="category-icon" aria-hidden="true">${categoryIcons[transaction.category] ?? "·"}</span><div class="transaction-meta"><strong>${escapeHtml(transaction.merchant || transaction.category)}</strong><span>${escapeHtml(transaction.category)} · ${escapeHtml(transaction.date)}</span></div><span class="transaction-account">${escapeHtml(account?.name ?? "未知账户")} · ${typeLabels[transaction.type]}</span><strong class="transaction-amount ${isIncome ? "income" : ""}" data-money>${sign}${money(transaction.amountCents)}</strong>${allowDelete ? `<button class="row-delete" type="button" data-action="delete-transaction" data-id="${escapeHtml(transaction.id)}" aria-label="删除这笔交易">×</button>` : ""}</div>`;
    }).join("");
  }

  renderTransactions(state, ui) {
    const accountById = new Map(state.accounts.map((account) => [account.id, account]));
    const query = ui.search.trim().toLocaleLowerCase();
    const rows = state.transactions.filter((transaction) => transaction.date.startsWith(ui.month))
      .filter((transaction) => ui.transactionType === "all" || transaction.type === ui.transactionType)
      .filter((transaction) => !query || [transaction.merchant, transaction.category, transaction.note].some((value) => value?.toLocaleLowerCase().includes(query)));
    this.transactions.innerHTML = `<div class="panel full-ledger"><div class="transaction-rows">${this.transactionRows(rows, accountById, true) || '<div class="empty-state"><strong>没有符合条件的交易</strong>调整筛选条件，或记录一笔新交易。</div>'}</div></div>`;
  }

  renderAccounts(state) {
    this.accounts.innerHTML = state.accounts.map((account) => {
      const balance = calculateAccountBalance(account, state.transactions);
      const related = state.transactions.filter((transaction) => transaction.accountId === account.id || transaction.targetAccountId === account.id).length;
      return `<article class="panel account-card"><div class="account-card-head"><div><h3>${escapeHtml(account.name)}</h3><span>${escapeHtml(account.type)}</span></div><span class="account-kind">${account.kind === "asset" ? "资产" : "负债"}</span></div><div class="account-balance" data-money>${money(balance)}</div><footer><span>${related} 笔相关交易</span><span>人民币 CNY</span></footer></article>`;
    }).join("");
  }

  renderBudgets(state, month) {
    const expenses = state.transactions.filter(({ type, date }) => type === "expense" && date.startsWith(month));
    const rows = state.budgets.filter((budget) => budget.month === month).map((budget) => {
      const spent = expenses.filter(({ category }) => category === budget.category).reduce((sum, transaction) => sum + transaction.amountCents, 0);
      const progress = budgetProgress(spent, budget.limitCents);
      const statusLabel = { normal: "进度正常", warning: "接近上限", over: "已经超支" }[progress.status];
      return `<article class="panel budget-page-card"><div class="budget-label"><h3>${escapeHtml(budget.category)}</h3><span>${statusLabel}</span></div><div class="progress-track"><div class="progress-fill ${progress.status}" style="width:${Math.min(progress.ratio * 100, 100)}%"></div></div><div class="budget-numbers"><span>已使用<strong data-money>${money(spent)}</strong></span><span>剩余<strong data-money>${money(progress.remainingCents)}</strong></span><span>预算<strong data-money>${money(budget.limitCents)}</strong></span></div></article>`;
    }).join("");
    this.budgets.innerHTML = rows || '<div class="panel empty-state"><strong>这个月还没有预算</strong>先为最容易超支的分类设置额度。</div>';
  }

  syncAccountSelects(accounts) {
    const options = accounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`).join("");
    this.document.querySelectorAll("[data-account-select]").forEach((select) => {
      const selected = select.value;
      select.innerHTML = options;
      if (accounts.some(({ id }) => id === selected)) select.value = selected;
    });
  }

  openDialog(id) { this.document.querySelector(`#${id}`).showModal(); }
  closeDialog(dialog) { dialog.close(); }
  showToast(message) {
    const toast = this.document.querySelector("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }
}
