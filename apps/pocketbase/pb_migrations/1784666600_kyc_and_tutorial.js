/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("role")) {
      users.fields.add(new SelectField({ name: "role", maxSelect: 1, values: ["user", "admin"] }));
    }
    if (!users.fields.getByName("tutorialDone")) {
      users.fields.add(new BoolField({ name: "tutorialDone" }));
    }
    app.save(users);

    let exists = true;
    try { app.findCollectionByNameOrId("kyc_submissions"); } catch (_) { exists = false; }
    if (!exists) {
      const kyc = new Collection({
        type: "base",
        name: "kyc_submissions",
        listRule: "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')",
        viewRule: "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
        updateRule: "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.id = owner)",
        deleteRule: "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.id = owner)",
        fields: [
          { name: "fullName", type: "text", required: true, max: 120 },
          { name: "dob", type: "text", max: 20 },
          { name: "idType", type: "select", maxSelect: 1, values: ["Passport", "Driver's License", "National ID"] },
          { name: "idNumber", type: "text", max: 60 },
          { name: "country", type: "text", max: 80 },
          { name: "address", type: "text", max: 200 },
          { name: "city", type: "text", max: 80 },
          { name: "postalCode", type: "text", max: 30 },
          { name: "accountType", type: "select", maxSelect: 1, values: ["individual", "business"] },
          { name: "businessName", type: "text", max: 160 },
          { name: "selfie", type: "file", maxSelect: 1, maxSize: 8388608, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
          { name: "status", type: "select", maxSelect: 1, values: ["pending", "approved", "rejected"] },
          { name: "reviewNote", type: "text", max: 400 },
          {
            name: "owner", type: "relation", required: true, maxSelect: 1,
            collectionId: users.id, cascadeDelete: true,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(kyc);
    }
  },
  (app) => {
    try { app.delete(app.findCollectionByNameOrId("kyc_submissions")); } catch (_) { /* noop */ }
    try {
      const users = app.findCollectionByNameOrId("users");
      users.fields.removeByName("role");
      users.fields.removeByName("tutorialDone");
      app.save(users);
    } catch (_) { /* noop */ }
  },
);
