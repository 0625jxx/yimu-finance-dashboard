import { findDuplicateTransactions, parseTransactionCsv } from "../model/finance-model.js";

export class AppController {
  constructor(store, view) {
    this.store = store;
    this.view = view;
    this.document = view.document;
    this.ui = {
      route: "dashboard",
      month: new Date().toISOString().slice(0, 7),
      hideAmounts: false,
      transactionType: "all",
      search: "",
    };
  }

  start() {
    this.store.subscribe(() => this.render());
    this.bindEvents();
    this.render();
  }

  render() { this.view.render(this.store.getState(), this.ui); }

  bindEvents() {
    this.document.addEventListener("click", (event) => this.handleClick(event));
    this.document.querySelector("#month-picker").addEventListener("change", (event) => {
      this.ui.month = event.target.value;
      this.render();
    });
    this.document.querySelector("#transaction-search").addEventListener("input", (event) => {
      this.ui.search = event.target.value;
      this.render();
      event.target.focus();
    });
    this.document.querySelector("#transaction-form").addEventListener("submit", (event) => this.addTransaction(event));
    this.document.querySelector("#account-form").addEventListener("submit", (event) => this.addAccount(event));
    this.document.querySelector("#budget-form").addEventListener("submit", (event) => this.setBudget(event));
    this.document.querySelector("#csv-input").addEventListener("change", (event) => this.importCsv(event));
    this.document.querySelector("#transaction-form").addEventListener("change", (event) => {
      if (event.target.name === "type") this.updateTransactionFields(event.target.value);
    });
  }

  handleClick(event) {
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) {
      event.preventDefault();
      this.ui.route = routeButton.dataset.route;
      this.render();
      return;
    }
    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) {
      this.view.closeDialog(closeButton.closest("dialog"));
      return;
    }
    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      this.ui.transactionType = filterButton.dataset.filter;
      this.document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("is-active", button === filterButton));
      this.render();
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const actions = {
      "new-transaction": () => this.openTransactionDialog(),
      "new-account": () => this.view.openDialog("account-dialog"),
      "new-budget": () => this.view.openDialog("budget-dialog"),
      "toggle-privacy": () => { this.ui.hideAmounts = !this.ui.hideAmounts; this.render(); },
      "import-csv": () => this.document.querySelector("#csv-input").click(),
      "export-data": () => this.exportData(),
      "delete-transaction": () => this.deleteTransaction(actionButton.dataset.id),
    };
    actions[actionButton.dataset.action]?.();
  }

  openTransactionDialog() {
    const form = this.document.querySelector("#transaction-form");
    form.reset();
    form.elements.date.value = `${this.ui.month}-${String(Math.min(new Date().getDate(), 28)).padStart(2, "0")}`;
    this.updateTransactionFields("expense");
    this.view.openDialog("transaction-dialog");
    setTimeout(() => form.elements.amount.focus(), 0);
  }

  updateTransactionFields(type) {
    const form = this.document.querySelector("#transaction-form");
    const isTransfer = type === "transfer";
    form.querySelector("[data-target-account]").hidden = !isTransfer;
    form.elements.targetAccountId.required = isTransfer;
    form.querySelector("[data-category-field]").hidden = isTransfer;
  }

  addTransaction(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const type = data.get("type");
    const transaction = {
      type,
      amountCents: Math.round(Number(data.get("amount")) * 100),
      accountId: data.get("accountId"),
      date: data.get("date"),
      category: type === "transfer" ? "转账" : data.get("category"),
      merchant: data.get("merchant").trim(),
      note: data.get("note").trim(),
    };
    if (type === "transfer") {
      transaction.targetAccountId = data.get("targetAccountId");
      if (transaction.accountId === transaction.targetAccountId) {
        this.view.showToast("转出和转入账户不能相同");
        return;
      }
    }
    try {
      this.store.addTransaction(transaction);
      this.view.closeDialog(form.closest("dialog"));
      this.view.showToast("记录已保存");
    } catch (error) {
      this.view.showToast(error.message);
    }
  }

  addAccount(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    this.store.addAccount({
      name: data.get("name").trim(),
      kind: data.get("kind"),
      type: data.get("type"),
      openingBalanceCents: Math.round(Number(data.get("openingBalance")) * 100),
      color: data.get("kind") === "liability" ? "orange" : "blue",
    });
    this.view.closeDialog(form.closest("dialog"));
    form.reset();
    this.view.showToast("账户已添加");
  }

  setBudget(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    this.store.setBudget({ month: this.ui.month, category: data.get("category"), limitCents: Math.round(Number(data.get("amount")) * 100) });
    this.view.closeDialog(form.closest("dialog"));
    form.reset();
    this.view.showToast("预算已更新");
  }

  deleteTransaction(id) {
    if (!globalThis.confirm("删除后账户余额和报表会同步重算。确认删除这笔交易吗？")) return;
    this.store.removeTransaction(id);
    this.view.showToast("交易已删除");
  }

  async importCsv(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const rows = parseTransactionCsv(await file.text());
      const state = this.store.getState();
      const accountByName = new Map(state.accounts.map((account) => [account.name, account.id]));
      const prepared = rows.map((row) => ({ ...row, accountId: accountByName.get(row.accountName) ?? state.accounts[0]?.id }));
      const duplicates = new Set(findDuplicateTransactions(state.transactions, prepared));
      const unique = prepared.filter(({ id }) => !duplicates.has(id));
      if (duplicates.size && !globalThis.confirm(`发现 ${duplicates.size} 笔疑似重复交易。将跳过重复项并导入其余 ${unique.length} 笔，是否继续？`)) return;
      if (unique.length) this.store.addTransactions(unique);
      this.view.showToast(`已导入 ${unique.length} 笔，跳过 ${duplicates.size} 笔重复项`);
    } catch (error) {
      this.view.showToast(`导入失败：${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  exportData() {
    const blob = new Blob([JSON.stringify(this.store.getState(), null, 2)], { type: "application/json;charset=utf-8" });
    const link = this.document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `一目财务数据-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.view.showToast("数据已导出");
  }
}
