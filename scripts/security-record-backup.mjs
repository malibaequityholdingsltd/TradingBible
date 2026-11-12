#!/usr/bin/env node
/**
 * Record the 12 November 2026 encrypted application snapshot evidence.
 * Run from the repository root on the production host:
 *   node scripts/security-record-backup.mjs
 */
import {
  updateSecurityControl,
  updateSecurityAcceptance,
} from '../apps/api/src/services/security-programme.js';

const actor = 'backup-2026-11-12';
const reviewedAt = '2026-11-12';
const nextReview = '2027-02-12';

const backup = await updateSecurityControl('infrastructure.backups', {
  status: 'in_progress',
  evidence: 'docs/security/evidence/2026-11-12-encrypted-app-backup-test.md',
  note: 'Daily systemd snapshot at 03:15 UTC encrypts code, SPA, controlled documents and runtime JSON stores with AES256; 14-day local retention; .env excluded; encrypted archive restored and served successfully. Still local-only, passphrase on the same host, no separate backup account, off-site copy, immutability lock, or database coverage.',
  reviewedAt,
  nextReview,
}, actor);
console.log(`control infrastructure.backups: ${backup.control.status}`);

const restore = await updateSecurityControl('infrastructure.restore_tests', {
  status: 'in_progress',
  evidence: 'docs/security/evidence/2026-11-12-app-restore-test.md; docs/security/evidence/2026-11-12-encrypted-app-backup-test.md',
  note: 'A 33 MB pre-deploy archive and the daily encrypted snapshot both restored into temporary directories, passed node --check and served the SPA with HTTP 200. The encrypted snapshot included the security register and workforce handbook and excluded .env. Database restore, isolation and RPO/RTO verification remain pending.',
  reviewedAt,
  nextReview,
}, actor);
console.log(`control infrastructure.restore_tests: ${restore.control.status}`);

const acceptance = await updateSecurityAcceptance('accept.restore', {
  status: 'blocked',
  note: 'Application archives restore successfully, including the encrypted daily snapshot. No database restore, isolated full-stack restore or measured database RTO/RPO has been performed.',
}, actor);
console.log(`acceptance accept.restore: ${acceptance.acceptance.status}`);

console.log('backup evidence recorded');
