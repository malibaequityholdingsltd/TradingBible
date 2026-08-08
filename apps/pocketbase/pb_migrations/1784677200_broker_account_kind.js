/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("broker_accounts");

    if (!collection.fields.getByName("accountKind")) {
      collection.fields.add(
        new SelectField({
          name: "accountKind",
          maxSelect: 1,
          required: false,
          values: ["live", "prop"],
        }),
      );
    }
    app.save(collection);

    // Backfill existing rows as live broker accounts.
    const rows = app.findRecordsByFilter("broker_accounts", "accountKind = ''");
    for (const r of rows) {
      r.set("accountKind", "live");
      app.save(r);
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("broker_accounts");
    collection.fields.removeByName("accountKind");
    app.save(collection);
  },
);
