/// <reference path="../pb_data/types.d.ts" />

// Audit trail + communication history for the admin KYC/KYB dashboard.
// Only an admin (role = 'admin') may read or write these records — regular
// users never touch this collection directly. Emails to the applicant are
// sent from a hook when a message/request-info entry is created.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const submissions = app.findCollectionByNameOrId("kyc_submissions");

    const collection = new Collection({
      type: "base",
      name: "kyc_audit_logs",
      listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      updateRule: null,
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: "submission",
          type: "relation",
          required: false,
          maxSelect: 1,
          collectionId: submissions.id,
          cascadeDelete: true,
        },
        {
          name: "targetUser",
          type: "relation",
          required: false,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: false,
        },
        {
          name: "admin",
          type: "relation",
          required: false,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: false,
        },
        {
          name: "adminEmail",
          type: "text",
          required: false,
          max: 120,
        },
        {
          name: "action",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["approved", "rejected", "note", "request_info", "message", "flag"],
        },
        { name: "message", type: "text", required: false, max: 2000 },
        { name: "notifyUser", type: "bool", required: false },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      ],
      indexes: [
        "CREATE INDEX idx_kyc_audit_submission ON kyc_audit_logs (submission)",
        "CREATE INDEX idx_kyc_audit_target ON kyc_audit_logs (targetUser)",
      ],
    });
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("kyc_audit_logs");
    app.delete(collection);
  },
);
