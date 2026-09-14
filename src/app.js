import { createFinanceStore } from "./model/finance-model.js";
import { DashboardView } from "./view/dashboard-view.js";
import { AppController } from "./controller/app-controller.js";
import { seedData } from "./data/seed-data.js";

const storageKey = "yimu-finance-state-v1";
const loadState = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? seedData;
  } catch {
    return seedData;
  }
};

const store = createFinanceStore(loadState(), (state) => {
  localStorage.setItem(storageKey, JSON.stringify(state));
});
const view = new DashboardView(document);
const controller = new AppController(store, view);

controller.start();
