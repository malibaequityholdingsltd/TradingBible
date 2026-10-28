# TB stock document library

Nine signature-ready preparation instruments for a proposed future TB
public listing. They are drafts, not approved, effective, or executed
instruments.

- `docx/` is the reader/download copy served through the TB stock documents API.
- `docx-protected/` is the controlled source used when appending a completed
  DocuSign execution record. PDF copies are not distributed.
- `pdf/` is internal and exists only so DocuSign can anchor recipient tabs.
- `.execution/` is runtime execution state and is deliberately git-ignored.

Rebuild the package from the source style drafts with:

```sh
python3 scripts/build-tb-stock-documents.py
```

The build script adds a unique execution block for each signer, rejects
`.net` references, and replaces the source `DocSign` label with `DocuSign`.
Do not send an envelope until signer identity, capacity, consent, and the
required legal/regulatory review are confirmed. TB equity remains separate
from TBC token records and from shareholder ownership records.
