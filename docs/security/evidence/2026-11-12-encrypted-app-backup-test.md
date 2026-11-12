# Encrypted application snapshot and restore test — 12 November 2026

**Host:** production VPS `2.25.166.110`  \
**Archive:** `/var/backups/tradingbible/app-20261112T210941Z.tar.gz.gpg`  \
**Encrypted size:** 34,661,734 bytes  \
**Encrypted SHA-256:** `aff6fb06984e84cdec3969b2649b4550450ee33e8346ed2d3abac54c72b55af4`  \
**Plaintext SHA-256:** `edd54ec26640533bb92617026e49fda32bb7e919b9efc01859a44564d67b8b68`  \
**Passphrase file mode:** `0600 root:root`  \
**Backup directory mode:** `0700 root:root`  \
**Schedule:** daily at 03:15 UTC with up to 10 minutes of randomised delay; persistent catch-up enabled  \
**Local retention:** 14 days  \
**Operator:** OpenCode agent, under explicit user authorization

## Result

| Check | Result |
| --- | --- |
| Encrypted archive checksum verification | OK |
| GPG decryption | succeeded |
| Decrypted archive readable | yes |
| Extraction time (whole seconds) | 1 second for 34.7 MB |
| Files restored | 559 |
| API entry point restored | yes |
| Security register restored | yes |
| Workforce handbook restored | yes |
| SPA index restored | yes |
| Restored API source parses (`node --check`) | yes |
| Restored SPA served over loopback HTTP | 200 |
| `.env` files inside archive | 0 |
| Temporary restore directory removed | yes |

## Coverage

The snapshot includes:

- `apps/api/src` and `apps/api/package.json`;
- `apps/api/storage` (security, workforce and investor-letter runtime stores when present);
- `dist/apps/web` (the production SPA);
- `docs/security` and `docs/hr` controlled documents;
- `scripts`.

It deliberately excludes `.env`, `node_modules`, build caches and provider credentials.

## Limitations

This is still **not** a complete backup control:

- the repository is on the same host and in the same administrative account;
- the passphrase is stored on the same host for automated execution;
- there is no off-site copy, immutable retention lock or separate backup account;
- Supabase data, storage objects and auth records are not included;
- no database point-in-time recovery or database restore has been tested;
- no independent reviewer has signed this evidence.

The backup passphrase must be escrowed offline before the host is treated as
recoverable. Until then, this is a local recovery aid and a tested first step,
not a disaster-recovery guarantee.
