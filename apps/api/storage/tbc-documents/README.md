# TBC controlled document library

`manifest.json` is the source of truth for the public summaries and the
controlled corporate instruments.

## Versioned with the repository

The five public summaries (`visibility: "public"`) are versioned here in both
PDF and DOCX form. They are served through the public document API and may be
downloaded from `/tbc/documents`.

## Not versioned

The 26 corporate and governance instruments (`visibility: "internal"`) contain
confidential issuer information, including tax identifiers, registered-office
details and signature blocks. They are intentionally excluded by `.gitignore`
and must be provisioned on the API host (for example, from a secrets manager
or a read-only deployment volume) at the paths recorded in `manifest.json`.

The API only streams those files after an authenticated administrator check.
Never add them to Git, a web bundle, a public bucket or a support attachment.
