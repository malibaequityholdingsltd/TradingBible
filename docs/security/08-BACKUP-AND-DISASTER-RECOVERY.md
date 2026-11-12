# Backup and Disaster Recovery

**Controlled programme document · management approval not recorded**

## 1. Proposed recovery objectives

The following are **proposed targets**, not current platform capabilities. They must be validated against the actual database plan, hosting, backup frequency, restoration test and recovery staffing.

| System | Target RPO | Target RTO |
| --- | --- | --- |
| Customer accounts and journals | 15 minutes | 4 hours |
| Billing and transaction records | 15 minutes | 4 hours |
| Main platform | 1 hour | 4 hours |
| AI reports and research | 24 hours | 12 hours |
| Marketing website | 24 hours | 12 hours |

A target is not evidence. Record the achieved recovery point and recovery time from a real restore test. If the provider cannot meet the target, change the target or the architecture rather than claiming a capability that does not exist.

## 2. Backup layers

### Layer 1 — Hostinger infrastructure recovery

Use provider snapshots or recovery backups for the VPS. Confirm what is included, how long it is retained and whether it is encrypted at rest. Do not treat a provider snapshot as the only copy of customer data.

### Layer 2 — Independent encrypted copy

Keep encrypted copies of application configuration, deployment artefacts and essential server data in a separate account or failure domain. Use separate credentials from production administration. Restrict deletion. Store the recovery key offline.

### Layer 3 — Supabase database

Enable the available database backups and point-in-time recovery for the selected plan. Confirm retention and restoration procedure. Export critical data where the plan does not provide sufficient recovery.

### Layer 4 — Restoration test

Restore into an isolated environment and verify data integrity, application startup, authentication, access controls and payment reconciliation. Record the result and the achieved RPO/RTO.

## 3. Backup standard

- Encrypt backups in transit and at rest.
- Use at least three copies in two media or systems, with one off-site or in a separate failure domain.
- Keep an immutable or write-protected copy where supported.
- Separate the backup account from normal production administration.
- Restrict backup deletion to a named recovery role.
- Alert on backup failure, deletion, retention change and restore-test failure.
- Keep backup credentials offline or in a controlled vault.
- Test the recovery key before an emergency.
- Document the restore procedure and the person authorised to execute it.
- Do not store a backup on the same compromised host or network.
- Do not use an unencrypted provider snapshot as the only protection for confidential information.

## 4. Scope

At minimum, protect:

- Supabase PostgreSQL data and storage objects;
- application environment configuration and secrets inventory (not secrets in plain text in the backup if avoidable);
- deployment artefacts and source commit reference;
- Nginx and PM2 configuration;
- DNS and edge configuration export;
- security register and audit records;
- workforce compliance register and controlled HR documents;
- investor-letter register and campaign audit;
- payment and billing reconciliation records; and
- incident evidence under legal hold.

Broker credentials are encrypted in the application vault. Back up the vault ciphertext and protect the encryption key separately. A backup of ciphertext without the key is useless; a backup of the key with the ciphertext defeats encryption.

## 5. Restoration procedure

1. Declare the recovery incident and assign an incident commander.
2. Confirm the scope: database, storage, application, configuration or all systems.
3. Preserve current logs and evidence before replacing anything.
4. Select the most recent verified backup that predates the damage.
5. Restore into an isolated environment, not directly over production.
6. Verify database integrity, row counts and critical records.
7. Verify authentication, RLS and administrative access.
8. Verify payment and broker integrations in a safe test mode.
9. Verify monitoring and backup jobs are running.
10. Obtain security and engineering approval before directing traffic to the restored environment.
11. Record achieved RPO/RTO, data loss, actions and follow-up items.
12. Rotate credentials that may have been exposed during the incident.

## 6. Disaster scenarios

| Scenario | Recovery approach |
| --- | --- |
| Accidental data deletion | Point-in-time restore or targeted recovery; preserve audit logs. |
| Ransomware | Isolate, preserve evidence, restore from offline/immutable backup, rebuild hosts, rotate credentials. |
| Hostinger account compromise | Use separate recovery account and offline credentials; contact provider; rebuild from trusted artefacts. |
| Supabase project outage | Follow provider recovery guidance; communicate status; restore from provider backup or export. |
| Domain or DNS compromise | Use registrar recovery, DNSSEC and registrar lock; verify DNS records before restoring traffic. |
| Payment-provider incident | Reconcile from provider records; pause payouts if authority is uncertain. |
| Lost administrator access | Use sealed break-glass procedure; verify identity; do not create a permanent shared account. |

## 7. Responsibilities

| Role | Responsibility |
| --- | --- |
| Security owner | Approves recovery activation for a security incident. |
| Engineering lead | Executes or supervises restore and verifies application integrity. |
| Infrastructure lead | Restores host, configuration and edge access. |
| Finance lead | Reconciles billing and payment records after recovery. |
| General Counsel | Advises on notification and evidence preservation. |
| Scribe | Records timeline, decisions and achieved recovery metrics. |

## 8. Testing

At least monthly:

- restore a recent database backup into isolation;
- verify critical table counts and a sample of customer-owned records;
- confirm RLS still prevents cross-tenant access;
- start the application against the restored data;
- record the time to restore and the data loss window; and
- delete the test environment securely after evidence is captured.

At least quarterly, test a broader scenario: lost host, lost database, lost domain access or ransomware. At least annually, review the provider's backup terms and encryption.

## 9. Evidence

Record in the security register:

- backup configuration and retention;
- encryption evidence;
- provider backup terms;
- restore-test date, operator and result;
- achieved RPO/RTO;
- data-integrity checks;
- access-control checks after restore;
- failed tests and corrective actions; and
- the current recovery contact tree in a restricted location.
