/// <reference path="../pb_data/types.d.ts" />

// Enforce a single admin: maliba_gt@outlook.com. Any other user currently
// flagged as admin is demoted to a regular user.
migrate(
  (app) => {
    const ADMIN_EMAIL = "maliba_gt@outlook.com";

    // Demote everyone who is currently an admin.
    let admins = [];
    try {
      admins = app.findRecordsByFilter("users", "role = 'admin'", "", 500, 0);
    } catch (_) {
      admins = [];
    }
    admins.forEach((rec) => {
      if (String(rec.get("email")).toLowerCase() !== ADMIN_EMAIL) {
        rec.set("role", "user");
        app.save(rec);
      }
    });

    // Promote the sole admin if the account exists.
    try {
      const target = app.findFirstRecordByFilter(
        "users",
        "email = {:email}",
        { email: ADMIN_EMAIL },
      );
      if (target) {
        target.set("role", "admin");
        app.save(target);
      }
    } catch (_) {
      // Account not created yet — the hook below will promote on first auth.
    }
  },
  (app) => {
    // No-op down: role changes are not reverted.
  },
);
