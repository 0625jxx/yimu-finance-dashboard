PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_meta (
    meta_key TEXT PRIMARY KEY,
    meta_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account_type TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('asset', 'liability')),
    opening_balance_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT,
    included_in_net_worth INTEGER,
    status TEXT
);

CREATE TABLE IF NOT EXISTS import_batches (
    batch_id TEXT PRIMARY KEY,
    file_name TEXT,
    created_at TEXT,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    undone_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id TEXT PRIMARY KEY,
    transaction_type TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    delta_cents INTEGER,
    transaction_date TEXT NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(account_id),
    target_account_id TEXT REFERENCES accounts(account_id),
    category TEXT NOT NULL,
    merchant TEXT,
    note TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    import_batch_id TEXT REFERENCES import_batches(batch_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_import_batch ON transactions(import_batch_id);

CREATE TABLE IF NOT EXISTS budgets (
    budget_month TEXT NOT NULL,
    category TEXT NOT NULL,
    limit_cents INTEGER NOT NULL CHECK (limit_cents >= 0),
    PRIMARY KEY (budget_month, category)
);

CREATE TABLE IF NOT EXISTS goals (
    goal_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current_cents INTEGER NOT NULL DEFAULT 0 CHECK (current_cents >= 0),
    target_cents INTEGER NOT NULL CHECK (target_cents > 0),
    target_date TEXT,
    goal_type TEXT
);
