import { createFinanceStore } from "./model/finance-model.js";
import { DashboardView } from "./view/dashboard-view.js";
import { AppController } from "./controller/app-controller.js";
import { seedData } from "./data/seed-data.js";
import { createPersistence } from "./data/persistence.js";

const bootstrap = async () => {
  const persistence = createPersistence({ fetcher: fetch, storage: localStorage, seedData });
  const store = createFinanceStore(await persistence.load(), (state) => {
    void persistence.save(state);
  });
  const view = new DashboardView(document);
  const controller = new AppController(store, view);

  controller.start();
};

void bootstrap();
