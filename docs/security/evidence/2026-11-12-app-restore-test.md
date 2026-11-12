# Application archive restore test — 12 November 2026

**Archive:** `/var/www/tradingbible/backups/pre-deploy-20261112T174602Z.tar.gz`  
**Archive size:** 34,424,776 bytes (32.8 MiB)  
**SHA-256:** `6213f4beff4b9792177b232b08edded919ebcc4b64c6d55b575fc5100ff4e926`  
**Restore target:** fresh `mktemp` directory under `/tmp`  
**Operator:** OpenCode agent, under explicit user authorization

## Result

| Check | Result |
| --- | --- |
| Archive readable and extracted | yes |
| Extraction time (whole seconds) | 0 seconds for 33 MB |
| Files restored | 502 |
| API source files restored | 95 |
| Web asset files restored | 179 |
| Restored API source parses (`node --check`) | yes |
| Restored SPA served over loopback HTTP | 200 |
| `.env` files inside archive | 0 |
| Temporary restore directory removed | yes |

## What was tested

The archive was extracted into a new temporary directory, the restored API entry
point was syntax-checked, and the restored SPA was served on `127.0.0.1:8099`.
A loopback request returned HTTP 200. The temporary directory and server were
then removed.

## Limitations

This is an **application and host-artifact restore test**, not a database
restore. It does not prove:

- restoration of Supabase customer data or storage;
- point-in-time recovery or achieved database RPO/RTO;
- restoration into a separate isolated host or network;
- application startup against restored data;
- access-control or RLS checks after restore.

A database restore test still requires Supabase project/database access and a
reviewed, isolated target. Do not describe this test as a full disaster-recovery
exercise.
