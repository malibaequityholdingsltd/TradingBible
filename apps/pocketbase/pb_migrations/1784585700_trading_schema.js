/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // --- Extend the users collection with profile fields ---
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("username")) {
      users.fields.add(new TextField({ name: "username", max: 60 }));
    }
    if (!users.fields.getByName("phone")) {
      users.fields.add(new TextField({ name: "phone", max: 40 }));
    }
    if (!users.fields.getByName("plan")) {
      users.fields.add(new SelectField({
        name: "plan",
        maxSelect: 1,
        values: ["trial", "pro", "elite", "professional"],
      }));
    }
    if (!users.fields.getByName("primaryMarket")) {
      users.fields.add(new TextField({ name: "primaryMarket", max: 40 }));
    }
    if (!users.fields.getByName("experience")) {
      users.fields.add(new TextField({ name: "experience", max: 40 }));
    }
    if (!users.fields.getByName("goal")) {
      users.fields.add(new TextField({ name: "goal", max: 60 }));
    }
    app.save(users);

    // --- Broker accounts ---
    let brokers;
    try {
      brokers = app.findCollectionByNameOrId("broker_accounts");
    } catch (_) {
      brokers = new Collection({
        type: "base",
        name: "broker_accounts",
        listRule: "@request.auth.id != '' && @request.auth.id = owner",
        viewRule: "@request.auth.id != '' && @request.auth.id = owner",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && @request.auth.id = owner",
        deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
        fields: [
          { name: "broker", type: "text", required: true, max: 60 },
          { name: "tag", type: "text", max: 20 },
          { name: "accountRef", type: "text", max: 80 },
          { name: "status", type: "select", maxSelect: 1, values: ["syncing", "synced", "error"] },
          { name: "balance", type: "number" },
          { name: "lastSync", type: "date" },
          {
            name: "owner", type: "relation", required: true, maxSelect: 1,
            collectionId: users.id, cascadeDelete: true,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(brokers);
    }

    // --- Trades (auto-synced from brokers) ---
    try {
      app.findCollectionByNameOrId("trades");
    } catch (_) {
      const trades = new Collection({
        type: "base",
        name: "trades",
        listRule: "@request.auth.id != '' && @request.auth.id = owner",
        viewRule: "@request.auth.id != '' && @request.auth.id = owner",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && @request.auth.id = owner",
        deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
        fields: [
          { name: "symbol", type: "text", required: true, max: 30 },
          { name: "market", type: "text", max: 30 },
          { name: "direction", type: "text", max: 10 },
          { name: "entry", type: "number" },
          { name: "exit", type: "number" },
          { name: "sl", type: "number" },
          { name: "tp", type: "number" },
          { name: "size", type: "number" },
          { name: "risk", type: "number" },
          { name: "pnl", type: "number" },
          { name: "strategy", type: "text", max: 60 },
          { name: "emotion", type: "text", max: 40 },
          { name: "notes", type: "text", max: 1000 },
          { name: "source", type: "text", max: 60 },
          { name: "tradeDate", type: "date" },
          {
            name: "owner", type: "relation", required: true, maxSelect: 1,
            collectionId: users.id, cascadeDelete: true,
          },
          {
            name: "broker", type: "relation", maxSelect: 1,
            collectionId: brokers.id, cascadeDelete: true,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(trades);
    }
  },
  (app) => {
    for (const name of ["trades", "broker_accounts"]) {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* noop */ }
    }
  },
);
