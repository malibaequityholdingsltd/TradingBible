/// <reference path="../pb_data/types.d.ts" />

// Seed a working demo admin account: admin@example.com / Password123!
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    let rec;
    try {
      rec = app.findFirstRecordByData("users", "email", "admin@example.com");
    } catch (_) {
      rec = null;
    }
    if (!rec) {
      rec = new Record(users);
      rec.set("email", "admin@example.com");
    }
    rec.set("password", "Password123!");
    rec.set("passwordConfirm", "Password123!");
    rec.set("verified", true);
    rec.set("name", "Demo Admin");
    rec.set("username", "demoadmin");
    rec.set("role", "admin");
    rec.set("plan", "elite");
    app.save(rec);
  },
  (app) => {
    try {
      const rec = app.findFirstRecordByData("users", "email", "admin@example.com");
      app.delete(rec);
    } catch (_) {
      // nothing to revert
    }
  },
);
