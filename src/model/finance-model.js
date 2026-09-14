const clone = (value) => JSON.parse(JSON.stringify(value));

const createId = (prefix) => {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
};

const amountForAccount = (account, transaction) => {
  const amount = transaction.amountCents;
  const isSource = transaction.accountId === account.id;
  const isTarget = transaction.targetAccountId === account.id;

  if (transaction.type === "adjustment" && isSource) {
    return transaction.deltaCents ?? amount;
  }

  if (account.kind === "liability") {
    if (transaction.type === "expense" && isSource) return amount;
    if (transaction.type === "income" && isSource) return -amount;
    if (transaction.type === "transfer" && isTarget) return -amount;
    if (transaction.type === "transfer" && isSource) return amount;
    return 0;
  }

  if (transaction.type === "income" && isSource) return amount;
  if (transaction.type === "expense" && isSource) return -amount;
  if (transaction.type === "transfer" && isSource) return -amount;
  if (transaction.type === "transfer" && isTarget) return amount;
  return 0;
};

export const calculateAccountBalance = (account, transactions) =>
  transactions.reduce(
    (balance, transaction) => balance + amountForAccount(account, transaction),
    account.openingBalanceCents,
  );

export const calculateSummary = (accounts, transactions, month) => {
  const balances = accounts.map((account) => ({
    kind: account.kind,
    balanceCents: calculateAccountBalance(account, transactions),
  }));
  const assetsCents = balances
    .filter(({ kind }) => kind === "asset")
    .reduce((sum, { balanceCents }) => sum + balanceCents, 0);
  const liabilitiesCents = balances
    .filter(({ kind }) => kind === "liability")
    .reduce((sum, { balanceCents }) => sum + balanceCents, 0);
  const inPeriod = transactions.filter(({ date }) => date.startsWith(month));
  const incomeCents = inPeriod
    .filter(({ type }) => type === "income")
    .reduce((sum, { amountCents }) => sum + amountCents, 0);
  const expenseCents = inPeriod
    .filter(({ type }) => type === "expense")
    .reduce((sum, { amountCents }) => sum + amountCents, 0);
  const netCashFlowCents = incomeCents - expenseCents;

  return {
    assetsCents,
    liabilitiesCents,
    netWorthCents: assetsCents - liabilitiesCents,
    incomeCents,
    expenseCents,
    netCashFlowCents,
    savingsRate: incomeCents === 0 ? null : netCashFlowCents / incomeCents,
  };
};

export const budgetProgress = (spentCents, limitCents) => {
  if (limitCents <= 0) return { ratio: null, remainingCents: null, status: "unset" };
  const ratio = spentCents / limitCents;
  return {
    ratio,
    remainingCents: limitCents - spentCents,
    status: ratio >= 1 ? "over" : ratio >= 0.8 ? "warning" : "normal",
  };
};

const splitCsvLine = (line) => {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
};

const transactionTypes = {
  收入: "income",
  支出: "expense",
  转账: "transfer",
  income: "income",
  expense: "expense",
  transfer: "transfer",
};

export const parseTransactionCsv = (csv) => {
  if (new TextEncoder().encode(csv).byteLength > 2 * 1024 * 1024) {
    throw new Error("CSV 文件不能超过 2MB");
  }
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  const fieldAt = (cells, name) => cells[headers.indexOf(name)] ?? "";

  return lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line);
    const amount = Number(fieldAt(cells, "金额"));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`第 ${rowIndex + 2} 行金额无效`);
    }
    const typeValue = fieldAt(cells, "类型");
    const type = transactionTypes[typeValue];
    if (!type) throw new Error(`第 ${rowIndex + 2} 行类型无效`);

    return {
      id: createId("import"),
      date: fieldAt(cells, "日期"),
      type,
      amountCents: Math.round(amount * 100),
      accountName: fieldAt(cells, "账户"),
      category: fieldAt(cells, "分类") || "未分类",
      merchant: fieldAt(cells, "商户"),
      note: fieldAt(cells, "备注"),
      source: "import",
    };
  });
};

const duplicateKey = ({ date, amountCents, accountId, merchant = "" }) =>
  [date, amountCents, accountId, merchant.trim().toLocaleLowerCase()].join("|");

export const findDuplicateTransactions = (existing, incoming) => {
  const keys = new Set(existing.map(duplicateKey));
  return incoming.filter((transaction) => keys.has(duplicateKey(transaction))).map(({ id }) => id);
};

export const createFinanceStore = (initialState, persist = () => {}) => {
  let state = clone(initialState);
  const observers = new Set();
  const publish = (event) => {
    persist(clone(state));
    observers.forEach((observer) => observer(clone(state), event));
  };

  return {
    getState: () => clone(state),
    subscribe(observer) {
      observers.add(observer);
      return () => observers.delete(observer);
    },
    addTransaction(transaction) {
      if (!Number.isInteger(transaction.amountCents) || transaction.amountCents <= 0) {
        throw new Error("金额必须大于 0");
      }
      state.transactions.unshift({
        id: transaction.id ?? createId("transaction"),
        source: transaction.source ?? "manual",
        ...clone(transaction),
      });
      publish("transaction:added");
    },
    addTransactions(transactions) {
      transactions.forEach((transaction) => {
        if (!Number.isInteger(transaction.amountCents) || transaction.amountCents <= 0) {
          throw new Error("金额必须大于 0");
        }
      });
      state.transactions.unshift(...clone(transactions));
      publish("transactions:imported");
    },
    removeTransaction(id) {
      state.transactions = state.transactions.filter((transaction) => transaction.id !== id);
      publish("transaction:removed");
    },
    addAccount(account) {
      state.accounts.push({ id: account.id ?? createId("account"), ...clone(account) });
      publish("account:added");
    },
    setBudget(budget) {
      const index = state.budgets.findIndex(({ month, category }) => month === budget.month && category === budget.category);
      if (index >= 0) state.budgets[index] = clone(budget);
      else state.budgets.push(clone(budget));
      publish("budget:changed");
    },
    replaceState(nextState) {
      state = clone(nextState);
      publish("state:replaced");
    },
  };
};
