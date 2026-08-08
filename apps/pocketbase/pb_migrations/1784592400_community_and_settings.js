/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // --- Forum threads (public read, authed create, owner edit/delete) ---
    let threads;
    try {
      threads = app.findCollectionByNameOrId("forum_threads");
    } catch (_) {
      threads = new Collection({
        type: "base",
        name: "forum_threads",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
        updateRule: "@request.auth.id != '' && @request.auth.id = owner",
        deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
        fields: [
          { name: "title", type: "text", required: true, max: 160 },
          { name: "body", type: "text", required: true, max: 4000 },
          { name: "category", type: "select", maxSelect: 1, values: ["General", "Strategies", "Psychology", "Crypto", "Forex", "Stocks", "Wins"] },
          { name: "authorName", type: "text", max: 60 },
          { name: "replyCount", type: "number" },
          {
            name: "owner", type: "relation", required: true, maxSelect: 1,
            collectionId: users.id, cascadeDelete: true,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: ["CREATE INDEX idx_threads_cat ON forum_threads (category)"],
      });
      app.save(threads);
    }

    // --- Forum replies (public read, authed create) ---
    try {
      app.findCollectionByNameOrId("forum_replies");
    } catch (_) {
      const replies = new Collection({
        type: "base",
        name: "forum_replies",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
        updateRule: "@request.auth.id != '' && @request.auth.id = owner",
        deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
        fields: [
          { name: "body", type: "text", required: true, max: 3000 },
          { name: "authorName", type: "text", max: 60 },
          {
            name: "thread", type: "relation", required: true, maxSelect: 1,
            collectionId: threads.id, cascadeDelete: true,
          },
          {
            name: "owner", type: "relation", required: true, maxSelect: 1,
            collectionId: users.id, cascadeDelete: true,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: ["CREATE INDEX idx_replies_thread ON forum_replies (thread)"],
      });
      app.save(replies);
    }

    // --- White-label branding settings (owner-scoped per reseller/admin) ---
    try {
      app.findCollectionByNameOrId("branding_settings");
    } catch (_) {
      const branding = new Collection({
        type: "base",
        name: "branding_settings",
        listRule: "@request.auth.id != '' && @request.auth.id = owner",
        viewRule: "@request.auth.id != '' && @request.auth.id = owner",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
        updateRule: "@request.auth.id != '' && @request.auth.id = owner",
        deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
        fields: [
          { name: "companyName", type: "text", max: 60 },
          { name: "primaryColor", type: "text", max: 20 },
          { name: "accentColor", type: "text", max: 20 },
          { name: "logoUrl", type: "text", max: 400 },
          { name: "tagline", type: "text", max: 120 },
          {
            name: "owner", type: "relation", required: true, maxSelect: 1,
            collectionId: users.id, cascadeDelete: true,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(branding);
    }
  },
  (app) => {
    for (const name of ["forum_replies", "forum_threads", "branding_settings"]) {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* noop */ }
    }
  },
);
