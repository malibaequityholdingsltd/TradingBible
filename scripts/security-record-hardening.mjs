#!/usr/bin/env node
/**
 * Record the 12 November 2026 host-hardening evidence in the security register.
 * This script updates only the live register; it does not change infrastructure.
 * Run from the repository root on the production host:
 *   node scripts/security-record-hardening.mjs
 */
import {
  updateSecurityControl,
  updateSecurityRisk,
  updateSecurityAcceptance,
} from '../apps/api/src/services/security-programme.js';

const actor = 'security-hardening-2026-11-12';
const reviewedAt = '2026-11-12';
const nextReview = '2027-02-12';

const controls = [
  {
    id: 'internet.host_firewall',
    status: 'verified',
    evidence: 'docs/security/evidence/2026-11-12-host-hardening.md',
    note: 'UFW is active with default-deny incoming and only 22/80/443 allowed. External scan confirmed 3001/5432/6379/8080/3306/27017 closed; the API listens only on 127.0.0.1. Public SSH on 22 remains until private access is implemented.',
  },
  {
    id: 'internet.server_tokens',
    status: 'verified',
    evidence: 'docs/security/evidence/2026-11-12-public-header-check-after.txt',
    note: 'HTTPS and the HTTP redirect return server: nginx without a version after server_tokens off. Error-detail review remains part of application testing.',
  },
  {
    id: 'application.headers',
    status: 'verified',
    evidence: 'docs/security/evidence/2026-11-12-public-header-check-after.txt; docs/security/evidence/2026-11-12-csp-browser-check.txt',
    note: 'HTML and API headers are single-owner: Nginx headers for the SPA/static edge and Helmet for the API. CSP enforced and checked in Chromium across eight public routes with zero violations. Authenticated admin CSP testing remains pending.',
  },
  {
    id: 'internet.network_firewall',
    status: 'in_progress',
    evidence: 'docs/security/evidence/2026-11-12-host-hardening.md',
    note: 'Host UFW is verified. A Hostinger provider firewall group and egress allow-list are not verified.',
  },
  {
    id: 'internet.origin_lockdown',
    status: 'in_progress',
    evidence: 'docs/security/evidence/2026-11-12-host-hardening.md',
    note: 'Node and database ports are no longer publicly reachable and the API is loopback-only. Public SSH remains on 22; Tailscale/private access and MFA are pending, so origin lockdown is not complete.',
  },
  {
    id: 'identity.privileged_access',
    status: 'in_progress',
    evidence: 'docs/security/evidence/2026-11-12-host-hardening.md',
    note: 'SSH is key-only with PermitRootLogin prohibit-password and a tested fresh key session. Root is still the only administrative account; private access, named accounts and administrator MFA are pending.',
  },
  {
    id: 'detection.central_logs',
    status: 'in_progress',
    evidence: 'docs/security/evidence/2026-11-12-host-hardening.md',
    note: 'fail2ban and auditd are active locally with identity, SSH, Nginx, TLS, persistence and application-storage watches. No central log destination, retention policy or access-controlled SIEM is configured.',
  },
  {
    id: 'infrastructure.logging',
    status: 'in_progress',
    evidence: 'docs/security/evidence/2026-11-12-host-hardening.md; apps/api/src/main.js',
    note: 'HTTP request logs and local auditd security watches exist. A reviewed application security-event schema and central retention are not recorded.',
  },
  {
    id: 'infrastructure.restore_tests',
    status: 'in_progress',
    evidence: 'docs/security/evidence/2026-11-12-app-restore-test.md',
    note: 'A 33 MB application archive restored into a fresh temporary directory, passed node --check and served the SPA with HTTP 200; no .env was present. Database restore, isolation and RPO/RTO verification remain pending.',
  },
  {
    id: 'internet.waf',
    status: 'blocked',
    note: 'No Cloudflare account, plan or API token is available. A WAF cannot be configured without provider access and a tested rollback path.',
  },
  {
    id: 'internet.ddos',
    status: 'blocked',
    note: 'No Cloudflare account or DDoS provider is available. Hostinger provider firewall and traffic-absorption configuration are not verified.',
  },
  {
    id: 'internet.cdn_proxy',
    status: 'blocked',
    note: 'Public DNS still resolves directly to the Hostinger origin. Cloudflare Tunnel or an authenticated origin-pull design requires account and DNS access.',
  },
  {
    id: 'infrastructure.rls',
    status: 'blocked',
    note: 'Supabase CLI is not authenticated and no database/management credential is available in this session. The read-only RLS audit has not been run; do not apply policy changes without review and a restore path.',
  },
  {
    id: 'detection.siem',
    status: 'blocked',
    note: 'No managed SIEM, Wazuh manager or separate monitoring host is provisioned. auditd/fail2ban are local detection foundations, not a SIEM.',
  },
  {
    id: 'detection.alerts',
    status: 'blocked',
    note: 'No alert destination, on-call route or tested notification channel is configured. SMTP is also failing authentication.',
  },
  {
    id: 'detection.edr',
    status: 'blocked',
    note: 'No EDR/MDM tenant or company-device enrolment is available. Browser/API hardening does not substitute for endpoint detection and response.',
  },
  {
    id: 'governance.pen_test',
    status: 'blocked',
    note: 'No independent penetration-test engagement, scope or signed authorization is recorded.',
  },
];

for (const item of controls) {
  const result = await updateSecurityControl(item.id, {
    status: item.status,
    evidence: item.evidence || '',
    note: item.note || '',
    reviewedAt,
    nextReview,
  }, actor);
  console.log(`control ${item.id}: ${result.control.status}`);
}

const riskResult = await updateSecurityRisk('risk-headers', {
  status: 'closed',
  closureEvidence: 'docs/security/evidence/2026-11-12-public-header-check-after.txt; docs/security/evidence/2026-11-12-csp-browser-check.txt',
  nextReview: '2027-05-12',
}, actor);
console.log(`risk risk-headers: ${riskResult.risk.status}`);

for (const id of ['risk-origin-exposure', 'risk-monitoring', 'risk-restore']) {
  const result = await updateSecurityRisk(id, { status: 'mitigating' }, actor);
  console.log(`risk ${id}: ${result.risk.status}`);
}

const headersTest = await updateSecurityAcceptance('accept.headers', {
  status: 'passed',
  evidence: 'docs/security/evidence/2026-11-12-public-header-check-after.txt; docs/security/evidence/2026-11-12-csp-browser-check.txt',
  note: 'Nginx and Helmet now own separate header surfaces. HTML/API header checks and eight-route Chromium CSP check passed. Authenticated admin CSP testing remains pending.',
  tester: 'OpenCode agent (operator)',
  testedAt: new Date().toISOString(),
}, actor);
console.log(`acceptance accept.headers: ${headersTest.acceptance.status}`);

const blockedTests = [
  ['accept.ports', 'External scan shows only 22/80/443 open; 3001/5432/6379/8080/3306/27017 are closed. Public SSH on 22 remains until private access is implemented.'],
  ['accept.ssh', 'SSH is key-only but still public on 22. Tailscale/private access and administrator MFA are not implemented.'],
  ['accept.private_access', 'No Tailscale or equivalent private administrator path is installed.'],
  ['accept.database', 'No Supabase database/management access is available for a direct-exposure and RLS test.'],
  ['accept.tenant', 'No production RLS audit or cross-tenant test has been run.'],
  ['accept.restore', 'Application archive restore passed, but no database restore or isolated full-stack restore was performed.'],
  ['accept.alerts', 'No SIEM/alert destination or on-call notification test exists.'],
  ['accept.edge', 'The origin is still directly reachable; no Cloudflare/WAF edge is configured.'],
];

for (const [id, note] of blockedTests) {
  const result = await updateSecurityAcceptance(id, { status: 'blocked', note }, actor);
  console.log(`acceptance ${id}: ${result.acceptance.status}`);
}

console.log('security hardening evidence recorded');
