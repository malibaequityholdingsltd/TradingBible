/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // --- Add Paddle billing fields to users ---
    const users = app.findCollectionByNameOrId("users");
    const addUserField = (name, factory) => {
      if (!users.fields.getByName(name)) users.fields.add(factory());
    };
    addUserField("paddleCustomerId", () => new TextField({ name: "paddleCustomerId", max: 60 }));
    addUserField("subscriptionId", () => new TextField({ name: "subscriptionId", max: 60 }));
    addUserField("subscriptionStatus", () => new TextField({ name: "subscriptionStatus", max: 30 }));
    addUserField("subscriptionPriceId", () => new TextField({ name: "subscriptionPriceId", max: 60 }));
    addUserField("currentPeriodEnd", () => new DateField({ name: "currentPeriodEnd" }));
    addUserField("cancelScheduled", () => new BoolField({ name: "cancelScheduled" }));
    addUserField("trialEndsAt", () => new DateField({ name: "trialEndsAt" }));
    app.save(users);

    // --- Billing events (receipts / invoices / payment history) ---
    // Server-only writes (Paddle webhook via superuser). Owner can read own.
    try {
      app.findCollectionByNameOrId("billing_events");
    } catch (_) {
      const events = new Collection({
        type: "base",
        name: "billing_events",
        listRule: "@request.auth.id != '' && @request.auth.id = owner",
        viewRule: "@request.auth.id != '' && @request.auth.id = owner",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: "eventType", type: "text", required: true, max: 60 },
          { name: "subscriptionId", type: "text", max: 60 },
          { name: "transactionId", type: "text", max: 60 },
          { name: "status", type: "text", max: 40 },
          { name: "amount", type: "number" },
          { name: "currency", type: "text", max: 10 },
          { name: "planName", type: "text", max: 60 },
          { name: "invoiceUrl", type: "text", max: 500 },
          { name: "occurredAt", type: "date" },
          {
            name: "owner", type: "relation", required: true, maxSelect: 1,
            collectionId: users.id, cascadeDelete: true,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        ],
        indexes: ["CREATE INDEX idx_billing_owner ON billing_events (owner)"],
      });
      app.save(events);
    }
  },
  (app) => {
    try { app.delete(app.findCollectionByNameOrId("billing_events")); } catch (_) { /* noop */ }
    const users = app.findCollectionByNameOrId("users");
    for (const n of ["paddleCustomerId", "subscriptionId", "subscriptionStatus", "subscriptionPriceId", "currentPeriodEnd", "cancelScheduled", "trialEndsAt"]) {
      try { users.fields.removeByName(n); } catch (_) { /* noop */ }
    }
    app.save(users);
  },
);
