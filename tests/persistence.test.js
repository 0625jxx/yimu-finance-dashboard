import test from "node:test";
import assert from "node:assert/strict";

import { createPersistence } from "../src/data/persistence.js";

const seed = { accounts: [{ id: "seed" }], transactions: [], budgets: [], goals: [], importBatches: [] };

const memoryStorage = (initial = null) => {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
    value: () => value,
  };
};

test("已初始化时优先读取服务端 SQLite 状态", async () => {
  const serverState = { ...seed, accounts: [{ id: "server" }] };
  const storage = memoryStorage(JSON.stringify({ ...seed, accounts: [{ id: "local" }] }));
  const persistence = createPersistence({
    storage,
    seedData: seed,
    fetcher: async () => ({ ok: true, json: async () => ({ initialized: true, state: serverState }) }),
  });

  assert.deepEqual(await persistence.load(), serverState);
});

test("数据库未初始化时写入演示数据作为首个持久化快照", async () => {
  const requests = [];
  const storage = memoryStorage();
  const persistence = createPersistence({
    storage,
    seedData: seed,
    fetcher: async (url, options) => {
      requests.push([url, options]);
      return options?.method === "PUT"
        ? { ok: true }
        : { ok: true, json: async () => ({ initialized: false, state: {} }) };
    },
  });

  assert.deepEqual(await persistence.load(), seed);
  assert.equal(requests[1][1].method, "PUT");
  assert.deepEqual(JSON.parse(requests[1][1].body), seed);
});

test("首次写入会补齐旧演示数据缺少的集合字段", async () => {
  const requests = [];
  const partialSeed = { accounts: [], transactions: [], budgets: [], goals: [] };
  const persistence = createPersistence({
    storage: memoryStorage(),
    seedData: partialSeed,
    fetcher: async (_url, options) => {
      requests.push(options);
      return options?.method === "PUT"
        ? { ok: true }
        : { ok: true, json: async () => ({ initialized: false, state: {} }) };
    },
  });

  const expected = { ...partialSeed, importBatches: [] };
  assert.deepEqual(await persistence.load(), expected);
  assert.deepEqual(JSON.parse(requests[1].body), expected);
});

test("服务端不可用时回退到 localStorage", async () => {
  const localState = { ...seed, accounts: [{ id: "local" }] };
  const persistence = createPersistence({
    storage: memoryStorage(JSON.stringify(localState)),
    seedData: seed,
    fetcher: async () => { throw new Error("offline"); },
  });

  assert.deepEqual(await persistence.load(), localState);
});

test("连续保存按调用顺序串行写入服务端", async () => {
  const bodies = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  const persistence = createPersistence({
    storage: memoryStorage(),
    seedData: seed,
    fetcher: async (_url, options) => {
      bodies.push(JSON.parse(options.body));
      if (bodies.length === 1) await firstGate;
      return { ok: true };
    },
  });

  const first = persistence.save({ ...seed, accounts: [{ id: "first" }] });
  const second = persistence.save({ ...seed, accounts: [{ id: "second" }] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(bodies.length, 1);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(bodies.map((body) => body.accounts[0].id), ["first", "second"]);
});
