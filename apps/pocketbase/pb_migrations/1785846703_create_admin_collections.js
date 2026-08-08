/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // admin_integrations — stores third-party API configs, admin-only
    let intCol;
    try { intCol = app.findCollectionByNameOrId("admin_integrations"); } catch (_) {
      intCol = new Collection({
        type: "base",
        name: "admin_integrations",
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "name", type: "text", required: true, max: 60 },
          { name: "provider", type: "text", required: true, max: 60 },
          { name: "apiKey", type: "text", max: 500 },
          { name: "apiSecret", type: "text", max: 500 },
          { name: "extraConfig", type: "json" },
          { name: "status", type: "select", maxSelect: 1, values: ["connected", "disconnected", "error"] },
          { name: "lastTestedAt", type: "date" },
          { name: "lastTestResult", type: "text", max: 300 },
          { name: "enabled", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(intCol);
    }

    // admin_api_keys — generated API keys for users/apps
    let akCol;
    try { akCol = app.findCollectionByNameOrId("admin_api_keys"); } catch (_) {
      akCol = new Collection({
        type: "base",
        name: "admin_api_keys",
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "name", type: "text", required: true, max: 100 },
          { name: "keyHash", type: "text", required: true, max: 200 },
          { name: "keyPrefix", type: "text", max: 20 },
          { name: "permissions", type: "json" },
          { name: "assignedTo", type: "text", max: 60 },
          { name: "status", type: "select", maxSelect: 1, values: ["active", "revoked"] },
          { name: "usageCount", type: "number" },
          { name: "lastUsedAt", type: "date" },
          { name: "expiresAt", type: "date" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(akCol);
    }

    // admin_plugins — plugin registry
    let plCol;
    try { plCol = app.findCollectionByNameOrId("admin_plugins"); } catch (_) {
      plCol = new Collection({
        type: "base",
        name: "admin_plugins",
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "name", type: "text", required: true, max: 100 },
          { name: "slug", type: "text", required: true, max: 60 },
          { name: "version", type: "text", max: 20 },
          { name: "description", type: "text", max: 400 },
          { name: "author", type: "text", max: 100 },
          { name: "enabled", type: "bool" },
          { name: "config", type: "json" },
          { name: "status", type: "select", maxSelect: 1, values: ["installed", "error", "disabled"] },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(plCol);
    }

    // admin_settings — global platform settings key/value store
    let settCol;
    try { settCol = app.findCollectionByNameOrId("admin_settings"); } catch (_) {
      settCol = new Collection({
        type: "base",
        name: "admin_settings",
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "key", type: "text", required: true, max: 100 },
          { name: "value", type: "json" },
          { name: "category", type: "text", max: 60 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(settCol);
    }
  },
  (app) => {
    for (const name of ["admin_integrations", "admin_api_keys", "admin_plugins", "admin_settings"]) {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
    }
  }
);
