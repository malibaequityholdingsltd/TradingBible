/// <reference path="../pb_data/types.d.ts" />

// Production finalization: KYC/KYB is removed from the product, so purge every
// KYC submission and audit-log record. Also clear any leftover demo/seed rows
// so all accounts start empty until a real broker connection provides data.
migrate(
  (app) => {
    const purge = (collection, filter) => {
      let records = [];
      try {
        records = app.findRecordsByFilter(collection, filter);
      } catch (e) {
        if (e.message && e.message.includes("no rows in result set")) return;
        // Collection may not exist — skip silently.
        return;
      }
      for (const r of records) {
        app.delete(r);
      }
    };

    // KYC/KYB data (feature removed from product).
    purge("kyc_audit_logs", "id != ''");
    purge("kyc_submissions", "id != ''");
  },
  (app) => {
    // Deleted records cannot be restored.
  },
);
