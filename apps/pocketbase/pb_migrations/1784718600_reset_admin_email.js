/// <reference path="../pb_data/types.d.ts" />

// Reset the sole admin to the new email. Demote every other admin.
migrate(
  (app) => {
    const NEW_ADMIN_EMAIL = "malibaequityholdingsltd@outlook.com";

    let admins = [];
    try {
      admins = app.findRecordsByFilter("users", "role = 'admin'", "", 500, 0);
    } catch (_) {
      admins = [];
    }
    admins.forEach((rec) => {
      if (String(rec.get("email")).toLowerCase() !== NEW_ADMIN_EMAIL) {
        rec.set("role", "user");
        app.save(rec);
      }
    });

    try {
      const target = app.findFirstRecordByFilter(
        "users",
        "email = {:email}",
        { email: NEW_ADMIN_EMAIL },
      );
      if (target) {
        target.set("role", "admin");
        app.save(target);
      }
    } catch (_) {
      // Account not created yet — the hook promotes it on first auth.
    }
  },
  (app) => {
    // No-op down: role changes are not reverted.
  },
);
