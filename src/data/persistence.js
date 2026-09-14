const clone = (value) => JSON.parse(JSON.stringify(value));
const COLLECTION_KEYS = ["accounts", "transactions", "budgets", "goals", "importBatches"];
const normalizeState = (value) => {
  const state = clone(value ?? {});
  COLLECTION_KEYS.forEach((key) => {
    if (!Array.isArray(state[key])) state[key] = [];
  });
  return state;
};

export const createPersistence = ({ fetcher, storage, seedData, storageKey = "yimu-finance-state-v1" }) => {
  let serverWriteQueue = Promise.resolve(true);
  const readLocal = () => {
    try {
      return normalizeState(JSON.parse(storage.getItem(storageKey)) ?? seedData);
    } catch {
      return normalizeState(seedData);
    }
  };

  const save = (state) => {
    const snapshot = normalizeState(state);
    storage.setItem(storageKey, JSON.stringify(snapshot));
    const writeServer = async () => {
      try {
        const response = await fetcher("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });
        return response.ok;
      } catch {
        return false;
      }
    };
    serverWriteQueue = serverWriteQueue.then(writeServer, writeServer);
    return serverWriteQueue;
  };

  const load = async () => {
    try {
      const response = await fetcher("/api/state", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("state api unavailable");
      const payload = await response.json();
      if (payload.initialized) return normalizeState(payload.state);
      const initial = normalizeState(seedData);
      await save(initial);
      return initial;
    } catch {
      return readLocal();
    }
  };

  return { load, save };
};
