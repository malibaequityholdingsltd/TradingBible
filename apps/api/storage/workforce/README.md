# Workforce compliance register

Runtime state is stored in `compliance.json` on the API host. It contains
employer-control evidence references, employee-file status, policy adoption
records and the audit log. It must never be committed, served as a static
file or copied to a public bucket.

- File mode: `0600`
- Directory mode: `0700`
- Access: admin API only
- Deployment: do not `rsync --delete` this directory; preserve `compliance.json`

The API creates the file on first use. Do not store identity documents,
medical records, bank details or tax identifiers in this register. Those
records belong in the controlled HR file or the approved payroll provider.
