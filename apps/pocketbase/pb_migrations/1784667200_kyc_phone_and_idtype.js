/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const kyc = app.findCollectionByNameOrId("kyc_submissions");

    // Add a phone number field used for uniqueness / contact.
    if (!kyc.fields.getByName("phone")) {
      kyc.fields.add(new TextField({ name: "phone", max: 40 }));
    }

    // Allow a Business Registration document as an ID type (KYB).
    const idType = kyc.fields.getByName("idType");
    if (idType) {
      idType.values = ["Passport", "Driver's License", "National ID", "Business Registration"];
    }

    app.save(kyc);
  },
  (app) => {
    try {
      const kyc = app.findCollectionByNameOrId("kyc_submissions");
      kyc.fields.removeByName("phone");
      const idType = kyc.fields.getByName("idType");
      if (idType) idType.values = ["Passport", "Driver's License", "National ID"];
      app.save(kyc);
    } catch (_) { /* noop */ }
  },
);
