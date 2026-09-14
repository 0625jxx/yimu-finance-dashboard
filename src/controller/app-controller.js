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
    this.document.querySelector("#goal-form").addEventListener("submit", (event) => this.saveGoal(event));
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
      "edit-transaction": () => this.openTransactionDialog(this.store.getState().transactions.find(({ id }) => id === actionButton.dataset.id)),
      "new-account": () => this.view.openDialog("account-dialog"),
      "new-budget": () => this.view.openDialog("budget-dialog"),
      "new-goal": () => this.openGoalDialog(),
      "edit-goal": () => this.openGoalDialog(this.store.getState().goals.find(({ id }) => id === actionButton.dataset.id)),
      "delete-goal": () => this.deleteGoal(actionButton.dataset.id),
      "delete-budget": () => this.deleteBudget(actionButton.dataset.month, actionButton.dataset.category),
      "undo-import": () => this.undoImport(actionButton.dataset.id),
      "toggle-privacy": () => { this.ui.hideAmounts = !this.ui.hideAmounts; this.render(); },
      "import-csv": () => this.document.querySelector("#csv-input").click(),
      "export-data": () => this.exportData(),
      "clear-data": () => this.clearData(),
      "delete-transaction": () => this.deleteTransaction(actionButton.dataset.id),
    };
    actions[actionButton.dataset.action]?.();
  }

  openTransactionDialog(transaction = null) {
    if (!this.store.getState().accounts.length) {
      this.ui.route = "accounts";
      this.render();
      this.view.showToast("请先添加一个账户，再记录交易");
      return;
    }
    const form = this.document.querySelector("#transaction-form");
    form.reset();
    form.elements.transactionId.value = transaction?.id ?? "";
    form.elements.amount.value = transaction ? (transaction.amountCents / 100).toFixed(2) : "";
    form.elements.date.value = transaction?.date ?? `${this.ui.month}-${String(Math.min(new Date().getDate(), 28)).padStart(2, "0")}`;
    form.elements.accountId.value = transaction?.accountId ?? form.elements.accountId.value;
    form.elements.targetAccountId.value = transaction?.targetAccountId ?? form.elements.targetAccountId.value;
    form.elements.category.value = transaction?.category ?? "餐饮";
    form.elements.merchant.value = transaction?.merchant ?? "";
    form.elements.note.value = transaction?.note ?? "";
    form.elements.namedItem("type").value = transaction?.type ?? "expense";
    this.document.querySelector("#transaction-dialog-kicker").textContent = transaction ? "修正已有记录" : "新增记录";
    this.document.querySelector("#transaction-dialog-title").textContent = transaction ? "编辑交易" : "记一笔";
    this.document.querySelector("#transaction-submit").textContent = transaction ? "保存修改" : "保存记录";
    this.updateTransactionFields(transaction?.type ?? "expense");
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
      const id = data.get("transactionId");
      if (id) this.store.updateTransaction(id, transaction);
      else this.store.addTransaction(transaction);
      this.view.closeDialog(form.closest("dialog"));
      this.view.showToast(id ? "修改已保存" : "记录已保存");
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

  openGoalDialog(goal = null) {
    const form = this.document.querySelector("#goal-form");
    form.reset();
    form.elements.goalId.value = goal?.id ?? "";
    form.elements.name.value = goal?.name ?? "";
    form.elements.type.value = goal?.type ?? "saving";
    form.elements.targetAmount.value = goal ? (goal.targetCents / 100).toFixed(2) : "";
    form.elements.currentAmount.value = goal ? (goal.currentCents / 100).toFixed(2) : "0";
    form.elements.targetDate.value = goal?.targetDate ?? "";
    this.document.querySelector("#goal-dialog-kicker").textContent = goal ? "更新目标进度" : "想实现什么";
    this.document.querySelector("#goal-dialog-title").textContent = goal ? "编辑财务目标" : "添加财务目标";
    this.document.querySelector("#goal-submit").textContent = goal ? "保存修改" : "保存目标";
    this.view.openDialog("goal-dialog");
  }

  saveGoal(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      this.store.saveGoal({
        id: data.get("goalId") || undefined,
        name: data.get("name").trim(),
        type: data.get("type"),
        targetCents: Math.round(Number(data.get("targetAmount")) * 100),
        currentCents: Math.round(Number(data.get("currentAmount")) * 100),
        targetDate: data.get("targetDate"),
      });
      this.view.closeDialog(form.closest("dialog"));
      this.view.showToast(data.get("goalId") ? "目标已更新" : "目标已添加");
    } catch (error) {
      this.view.showToast(error.message);
    }
  }

  deleteGoal(id) {
    if (!globalThis.confirm("删除后将无法继续跟踪这个目标。确认删除吗？")) return;
    this.store.removeGoal(id);
    this.view.showToast("目标已删除");
  }

  deleteBudget(month, category) {
    if (!globalThis.confirm(`确认删除 ${month} 的“${category}”预算吗？交易记录不会受到影响。`)) return;
    this.store.removeBudget(month, category);
    this.view.showToast("预算已删除");
  }

  clearData() {
    if (!globalThis.confirm("全部账户、交易、预算、目标和导入记录将永久删除，且无法撤销。确认彻底删除吗？")) return;
    this.store.clearAllData();
    this.ui.route = "dashboard";
    this.view.showToast("全部个人财务数据已清除");
  }

  undoImport(id) {
    if (!globalThis.confirm("撤销后，这个批次导入的全部交易都会删除，账户余额和报表将同步重算。是否继续？")) return;
    try {
      this.store.undoImportBatch(id);
      this.view.showToast("导入批次已撤销");
    } catch (error) {
      this.view.showToast(error.message);
    }
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
      if (unique.length) this.store.importTransactions(unique, { fileName: file.name });
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
