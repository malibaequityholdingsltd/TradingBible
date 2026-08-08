/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // ---- watchlists ----
    const watchlists = new Collection({
      type: "base",
      name: "watchlists",
      listRule: "@request.auth.id != '' && @request.auth.id = owner",
      viewRule: "@request.auth.id != '' && @request.auth.id = owner",
      createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
      updateRule: "@request.auth.id != '' && @request.auth.id = owner",
      deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
      fields: [
        { name: "name", type: "text", required: true, max: 80 },
        { name: "symbols", type: "json", maxSize: 200000 },
        { name: "isDefault", type: "bool" },
        {
          name: "owner", type: "relation", required: true, maxSelect: 1,
          collectionId: users.id, cascadeDelete: true,
        },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_watchlists_owner ON watchlists (owner)"],
    });
    app.save(watchlists);

    // ---- price_alerts ----
    const alerts = new Collection({
      type: "base",
      name: "price_alerts",
      listRule: "@request.auth.id != '' && @request.auth.id = owner",
      viewRule: "@request.auth.id != '' && @request.auth.id = owner",
      createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
      updateRule: "@request.auth.id != '' && @request.auth.id = owner",
      deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
      fields: [
        { name: "symbol", type: "text", required: true, max: 30 },
        {
          name: "alertType", type: "select", required: true, maxSelect: 1,
          values: ["above", "below", "pct_up", "pct_down"],
        },
        { name: "target", type: "number", required: true },
        { name: "basePrice", type: "number" },
        {
          name: "channels", type: "select", maxSelect: 3,
          values: ["in_app", "email", "sms"],
        },
        {
          name: "frequency", type: "select", maxSelect: 1,
          values: ["once", "daily", "weekly"],
        },
        {
          name: "status", type: "select", maxSelect: 1,
          values: ["active", "paused", "triggered"],
        },
        { name: "sound", type: "bool" },
        { name: "expiresAt", type: "date" },
        { name: "lastTriggered", type: "date" },
        { name: "triggerPrice", type: "number" },
        {
          name: "owner", type: "relation", required: true, maxSelect: 1,
          collectionId: users.id, cascadeDelete: true,
        },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_alerts_owner ON price_alerts (owner)"],
    });
    app.save(alerts);

    // ---- alert_history ----
    const history = new Collection({
      type: "base",
      name: "alert_history",
      listRule: "@request.auth.id != '' && @request.auth.id = owner",
      viewRule: "@request.auth.id != '' && @request.auth.id = owner",
      createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
      updateRule: "@request.auth.id != '' && @request.auth.id = owner",
      deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
      fields: [
        { name: "symbol", type: "text", required: true, max: 30 },
        { name: "alertType", type: "text", max: 30 },
        { name: "target", type: "number" },
        { name: "triggerPrice", type: "number" },
        { name: "message", type: "text", max: 400 },
        { name: "seen", type: "bool" },
        {
          name: "owner", type: "relation", required: true, maxSelect: 1,
          collectionId: users.id, cascadeDelete: true,
        },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      ],
      indexes: ["CREATE INDEX idx_alert_history_owner ON alert_history (owner)"],
    });
    app.save(history);

    // ---- trading_signals ----
    const signals = new Collection({
      type: "base",
      name: "trading_signals",
      listRule: "@request.auth.id != '' && @request.auth.id = owner",
      viewRule: "@request.auth.id != '' && @request.auth.id = owner",
      createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
      updateRule: "@request.auth.id != '' && @request.auth.id = owner",
      deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
      fields: [
        { name: "symbol", type: "text", required: true, max: 30 },
        { name: "timeframe", type: "text", max: 10 },
        {
          name: "signalType", type: "select", maxSelect: 1,
          values: ["strong_buy", "buy", "hold", "sell", "strong_sell"],
        },
        {
          name: "strength", type: "select", maxSelect: 1,
          values: ["weak", "moderate", "strong"],
        },
        { name: "indicators", type: "json", maxSize: 100000 },
        { name: "reason", type: "text", max: 500 },
        { name: "price", type: "number" },
        {
          name: "outcome", type: "select", maxSelect: 1,
          values: ["open", "win", "loss"],
        },
        {
          name: "owner", type: "relation", required: true, maxSelect: 1,
          collectionId: users.id, cascadeDelete: true,
        },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_signals_owner ON trading_signals (owner)"],
    });
    app.save(signals);
  },
  (app) => {
    for (const n of ["trading_signals", "alert_history", "price_alerts", "watchlists"]) {
      try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) {}
    }
  },
);
