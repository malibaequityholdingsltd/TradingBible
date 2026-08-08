/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("users");

    collection.mfa.enabled = true;
    collection.mfa.duration = 1800;
    collection.mfa.rule = "mfaEnabled = true"; // only users who opted in

    if (!collection.fields.getByName("mfaEnabled")) {
      collection.fields.add(new BoolField({ name: "mfaEnabled", required: false }));
    }

    collection.otp.enabled = true;
    collection.otp.duration = 300;
    collection.otp.length = 8;

    app.save(collection);
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId("users");
      collection.mfa.enabled = false;
      collection.otp.enabled = false;
      collection.fields.removeByName("mfaEnabled");
      app.save(collection);
    } catch (e) {
      if (String(e).includes("no rows in result set")) return;
      throw e;
    }
  },
);
