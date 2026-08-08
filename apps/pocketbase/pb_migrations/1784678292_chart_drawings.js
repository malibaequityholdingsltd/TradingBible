/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let collection;
    try {
      collection = app.findCollectionByNameOrId("chart_drawings");
    } catch (_) {
      const users = app.findCollectionByNameOrId("users");
      collection = new Collection({
        type: "base",
        name: "chart_drawings",
        // Owner-scoped, but allow reading shared drawing templates from others.
        listRule: "@request.auth.id != '' && (@request.auth.id = owner || shared = true)",
        viewRule: "@request.auth.id != '' && (@request.auth.id = owner || shared = true)",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
        updateRule: "@request.auth.id != '' && @request.auth.id = owner",
        deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
        fields: [
          { name: "symbol", type: "text", required: true, max: 30 },
          { name: "timeframe", type: "text", required: false, max: 10 },
          { name: "name", type: "text", required: false, max: 80 },
          { name: "isTemplate", type: "bool" },
          { name: "shared", type: "bool" },
          { name: "data", type: "json", maxSize: 500000 },
          {
            name: "owner",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE INDEX idx_drawings_owner_symbol ON chart_drawings (owner, symbol)",
        ],
      });
      app.save(collection);
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("chart_drawings");
      app.delete(collection);
    } catch (e) {
      if (String(e).includes("no rows")) return;
      throw e;
    }
  },
);
