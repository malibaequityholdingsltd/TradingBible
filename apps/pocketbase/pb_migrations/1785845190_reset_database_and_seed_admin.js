/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const dataCollections = [
      "kyc_audit_logs",
      "kyc_submissions",
      "alert_history",
      "price_alerts",
      "trading_signals",
      "chart_drawings",
      "terminal_layouts",
      "watchlists",
      "trades",
      "broker_accounts",
      "bank_transactions",
      "bank_cards",
      "crypto_accounts",
      "billing_events",
      "branding_settings",
      "forum_replies",
      "forum_threads",
      "academy_waitlist",
      "_integratedAiMessages",
    ];

    for (const name of dataCollections) {
      try {
        const records = app.findRecordsByFilter(name, "id != ''", "", 0, 0);
        for (const r of records) {
          app.delete(r);
        }
      } catch (e) {
        console.log(`skip cleanup for ${name}: ${e.message}`);
      }
    }

    // Delete every existing user account (cascades any remaining owned rows).
    try {
      const users = app.findRecordsByFilter("users", "id != ''", "", 0, 0);
      for (const u of users) {
        app.delete(u);
      }
    } catch (e) {
      console.log(`skip user cleanup: ${e.message}`);
    }

    // Fresh admin account.
    const usersCol = app.findCollectionByNameOrId("users");
    const admin = new Record(usersCol);
    admin.setEmail("malibaequityholdingsltd@outlook.com");
    admin.setPassword("Tb!Ad9m-K4vq7Zx2");
    admin.set("name", "Maliba Admin");
    admin.set("role", "admin");
    admin.set("plan", "elite");
    admin.set("verified", true);
    admin.set("tutorialDone", true);
    app.save(admin);
  },
  (app) => {
    try {
      const r = app.findAuthRecordByEmail(
        "users",
        "malibaequityholdingsltd@outlook.com",
      );
      app.delete(r);
    } catch (e) {
      console.log(`admin already removed: ${e.message}`);
    }
  },
);
