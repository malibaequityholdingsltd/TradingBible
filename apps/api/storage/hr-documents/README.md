# Workforce document pack

Twelve controlled workforce templates and reference documents for TradingBible
Holdings, Inc. They are prepared for counsel review and local adoption; they
are not executed agreements, legal opinions, payroll filings, insurance
policies or regulatory approvals.

- `md/` is the source copy.
- `docx/` is the readable Word copy.
- `pdf/` is the controlled review copy.
- `_assets/tradingbible-logo-256.png` is the generated logo derivative.
- `manifest.json` indexes the documents and byte sizes.

Rebuild from `docs/hr/` with:

```sh
node scripts/build-workforce-documents.mjs
```

The builder requires Google Chrome, `python-docx`, `Pillow` and `pypdf`.
Adoption is recorded separately in the Workforce Compliance Register. Do not
treat a generated file as adopted or counsel-approved.
