# Security programme register

Runtime state is stored in `programme.json` on the API host. It contains control
status, evidence references, risk decisions, incident summaries, supplier
assessments, training records, access reviews and the audit log.

- File mode: `0600`
- Directory mode: `0700`
- Access: admin API only
- Deployment: do not `rsync --delete` this directory; preserve `programme.json`

Do not store credentials, private keys, customer records, identity documents,
medical records, bank details, full incident evidence or payment-card data in
this register. Record a controlled evidence reference instead.

The register is a record of what an operator entered. It does not configure
Cloudflare, Hostinger, Tailscale, Supabase or the host firewall, and it does not
create a certification, audit opinion or independent test result.
