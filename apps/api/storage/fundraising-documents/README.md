# Confidential fundraising document packet

Twenty branded execution instruments for a proposed private placement and a
later Regulation CF track. Each file is a controlled record issued in final
form; an unsigned file is prepared for signature, not an executed instrument.

**CONTROLLED EXECUTION COPY · SIGNATURE REQUIRED · COUNSEL REVIEW REQUIRED**

There is no public projection of this folder, no offering page and no
investment button. The API routes are admin-only.

- `docx/` is the readable Word copy.
- `docx-protected/` is the controlled source used when appending a completed
  DocuSign execution record.
- `pdf/` is the DocuSign-anchored copy. It is also available to admins for
  counsel review; it is not public.
- `_assets/tradingbible-logo-256.png` is the smaller logo derivative used in
  generated files so the packet does not carry the full-size public asset.
- `manifest.json` is the index, signer map and DocuSign anchor registry. Do not
  hand-edit it; rebuild it.
- `.execution/` is runtime execution state and is git-ignored.

Rebuild the packet from `docs/fundraising/` with:

```sh
python3 scripts/build-fundraising-documents.py
```

The builder requires Google Chrome, `python-docx`, `Pillow` and `pypdf`. It
writes every DOCX and PDF, verifies the expected output count, records byte
sizes and anchors in the manifest, and can be run from the repository root.

## Execution rules

- DocuSign envelope creation and sending are locked unless
  `FUNDRAISING_EXECUTION_ENABLED=true` is set on the API host after board
  authorization and counsel review of the exact document version.
- Company and counsel sign only their own execution blocks. Investor
  questionnaires use custom text and checkbox tabs anchored to the investor's
  own completion lines.
- The DocuSign request email contains no bank details. Do not send funds until
  the document is countersigned and the funding instructions are independently
  verified.
- A completed envelope is execution evidence, not an SEC qualification, a
  Form D filing, a closing, a funding confirmation or a solicitation
  authorization.
- Form D is a worksheet in this packet. File the official form through EDGAR.
  The Regulation CF workbook is not a Form C and the offering is not qualified.
