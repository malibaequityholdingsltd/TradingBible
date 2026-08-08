/// <reference path="../pb_data/types.d.ts" />

// Creates (or updates) the sole admin account and ensures it can log in with
// the requested password and route to /admin/ via role = 'admin'.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const email = "malibaequityholdingsltd@outlook.com";
    const password = "Admin@123456";

    let admin;
    try {
      admin = app.findAuthRecordByEmail("users", email);
    } catch (_) {
      admin = new Record(users);
      admin.setEmail(email);
    }

    admin.setPassword(password);
    admin.set("verified", true);
    admin.set("role", "admin");
    if (!admin.get("name")) admin.set("name", "Maliba Equity Holdings");
    app.save(admin);
  },
  (app) => {
    try {
      const admin = app.findAuthRecordByEmail(
        "users",
        "malibaequityholdingsltd@outlook.com",
      );
      // Keep the account but demote it on rollback.
      admin.set("role", "user");
      app.save(admin);
    } catch (_) {
      /* already gone */
    }
  },
);
