// TradingBible Holdings, Inc. — information security and resilience programme.
//
// This file is the source of truth for the admin security register. A control
// definition is not evidence that the control operates. Evidence, management
// approval, test results and exceptions are recorded separately by the service.
// Nothing in this file claims ISO 27001 certification, SOC 2 compliance, PCI DSS
// compliance or a completed penetration test.

export const SECURITY_PROGRAMME_PROFILE = Object.freeze({
  companyName: 'TradingBible Holdings, Inc.',
  owner: 'Security owner not appointed',
  securityEmail: 'security@tradingbible.app',
  framework: 'NIST Cybersecurity Framework 2.0',
  supportingFrameworks: [
    'CIS Critical Security Controls',
    'OWASP Top 10:2025',
    'OWASP API Security Top 10',
    'ISO/IEC 27001 (target, not certified)',
    'SOC 2 Trust Services Criteria (target, not attested)',
    'PCI DSS via a compliant payment provider (not a merchant certification claim)',
  ],
  scope: 'TradingBible.app, customer accounts, journals and trading histories, broker integrations, AI systems, source code, APIs, cloud infrastructure, employee devices and identities, payments and billing records, company and investor documents, and future enterprise or white-label services.',
  objective: 'Prevent attacks where practical, detect intrusions quickly, contain damage, restore operations and protect customer information even if an attacker gets through. No firewall, antivirus product or certification guarantees that a company will never be breached.',
  certificationBoundary: 'TradingBible has not recorded an ISO/IEC 27001 certificate, a SOC 2 attestation, a PCI DSS assessment or a completed independent penetration test. Do not describe the company as certified or compliant until the independent evidence exists and is recorded in this register.',
  dataBoundary: 'Do not store customer credentials, broker secrets, private keys, identity documents, medical records or full payment-card data in this register. Record an evidence reference and the controlled location instead.',
});

export const SECURITY_LAYERS = Object.freeze([
  {
    id: 'internet',
    index: 'L1',
    title: 'Internet and network protection',
    blurb: 'Make the public edge resilient and keep the origin, management plane and databases away from arbitrary internet traffic.',
    icon: 'Globe2',
  },
  {
    id: 'application',
    index: 'L2',
    title: 'Application and API protection',
    blurb: 'Secure the React/Vite frontend, Node/Express API, authentication flows, file handling and release pipeline against application-layer attacks.',
    icon: 'Code2',
  },
  {
    id: 'identity',
    index: 'L3',
    title: 'Identity and access',
    blurb: 'Apply zero trust, least privilege and phishing-resistant authentication. No person or device gets implicit trust from network location.',
    icon: 'Fingerprint',
  },
  {
    id: 'infrastructure',
    index: 'L4',
    title: 'Infrastructure, data and AI',
    blurb: 'Protect Supabase, secrets, backups, broker tokens, customer isolation, AI context and payment data with layered controls.',
    icon: 'Database',
  },
  {
    id: 'detection',
    index: 'L5',
    title: 'Detection, response and recovery',
    blurb: 'Know when something is wrong, preserve evidence, contain the incident, restore from verified backups and learn from it.',
    icon: 'Activity',
  },
  {
    id: 'governance',
    index: 'L6',
    title: 'Governance and assurance',
    blurb: 'Assign accountability, maintain policies and risk records, assess suppliers, train people and obtain independent assurance.',
    icon: 'Scale',
  },
]);

export const SECURITY_CONTROL_STATUSES = Object.freeze([
  'not_started',
  'planned',
  'in_progress',
  'unverified',
  'implemented',
  'verified',
  'blocked',
  'not_applicable',
]);

export const SECURITY_RISK_STATUSES = Object.freeze(['open', 'mitigating', 'accepted', 'closed']);
export const SECURITY_INCIDENT_STATUSES = Object.freeze(['open', 'contained', 'recovering', 'closed']);
export const SECURITY_INCIDENT_SEVERITIES = Object.freeze(['sev1', 'sev2', 'sev3', 'sev4']);
export const SECURITY_VENDOR_STATUSES = Object.freeze(['not_assessed', 'in_review', 'approved', 'rejected']);
export const SECURITY_ACCEPTANCE_STATUSES = Object.freeze(['not_run', 'passed', 'failed', 'blocked', 'not_applicable']);

const control = (id, layerId, title, detail, evidenceExpected, owner, priority = 'high', extra = {}) => ({
  id,
  layerId,
  title,
  detail,
  evidenceExpected,
  owner,
  priority,
  launchCritical: priority === 'critical',
  status: 'not_started',
  evidence: '',
  note: '',
  reviewedAt: '',
  nextReview: '',
  ...extra,
});

export const SECURITY_CONTROLS = Object.freeze([
  // L1 — internet
  control('internet.dns', 'internet', 'Authoritative DNS, DNSSEC and registrar protection', 'Protect the domain registrar and authoritative DNS accounts with MFA, registrar lock and least privilege. Enable DNSSEC where the DNS provider supports it. Review DNS records for takeover risks.', 'Registrar access review, DNSSEC evidence, DNS record inventory', 'Security / IT', 'critical', {
    status: 'in_progress',
    evidence: 'docs/security/evidence/2026-11-12-dns-check.txt',
    note: 'Observed nameservers are Hostinger parking nameservers. No DS/DNSKEY response, CAA record or enforcing DMARC policy was observed on 2026-11-12. Registrar MFA and lock state have not been verified.',
  }),
  control('internet.waf', 'internet', 'Web application firewall and managed rules', 'Put a reviewed WAF in front of public web and API routes. Start managed rules in blocking mode after tuning. Protect login, password-reset, admin and public-write endpoints with targeted rules.', 'WAF configuration export, rule-set version, attack-log review', 'Security / IT', 'critical', {
    note: 'No WAF is evidenced in front of the production origin. Do not enable restrictive rules without a staging test and a rollback path.',
  }),
  control('internet.ddos', 'internet', 'DDoS protection and traffic absorption', 'Use an internet-facing provider with automatic L3/L4 and L7 DDoS mitigation. Confirm the origin is not directly reachable during an attack and that alerts reach the on-call owner.', 'Provider configuration, alert test, incident runbook', 'Security / IT', 'critical'),
  control('internet.tls', 'internet', 'TLS, certificate lifecycle and HTTPS enforcement', 'Enforce TLS 1.2 or 1.3, automate certificate renewal, monitor expiry and redirect HTTP to HTTPS. Disable obsolete protocols and weak ciphers.', 'TLS scan, renewal automation, expiry alert', 'IT', 'critical', {
    status: 'verified',
    evidence: 'docs/security/evidence/2026-11-12-tls-check.txt',
    note: 'Read-only check on 2026-11-12 showed a valid Let\'s Encrypt certificate, TLS 1.3 and a successful verification chain. Renewal automation and expiry alerting still need independent confirmation.',
    reviewedAt: '2026-11-12',
  }),
  control('internet.cdn_proxy', 'internet', 'CDN and origin-path review', 'Prefer a tunnel or authenticated origin pull so the public cannot bypass the security edge. If a conventional proxy is used, allow only the provider\'s current IP ranges at the origin.', 'Architecture diagram, proxy configuration, origin allow-list', 'Security / IT', 'critical', {
    note: 'Public DNS currently resolves to a Hostinger address and the origin responds directly. A Cloudflare Tunnel or equivalent origin-hiding design has not been implemented.',
  }),
  control('internet.origin_lockdown', 'internet', 'Origin lockdown and management-plane separation', 'Expose only the approved edge. Block public SSH, database, Node and internal-service ports. Put administrative access on a private network with individual accounts and MFA.', 'Firewall export, port-exposure test, private-access evidence', 'IT / Security', 'critical'),
  control('internet.network_firewall', 'internet', 'Cloud and network firewall', 'Maintain a default-deny inbound policy at the hosting provider and host firewall. Allow only required outbound traffic, package updates, DNS, monitoring and approved APIs.', 'Hostinger firewall group, UFW status, egress policy', 'IT', 'critical', {
    status: 'unverified',
    note: 'A firewall configuration may exist, but no reviewed export or external port-exposure test is recorded here.',
  }),
  control('internet.host_firewall', 'internet', 'Host firewall and listening-service inventory', 'Deny inbound traffic by default on the Ubuntu VPS. Review listening services regularly and remove development tools, databases and internal dashboards from public interfaces.', 'ufw status verbose, ss -tulpn review', 'IT', 'critical', {
    status: 'unverified',
  }),
  control('internet.egress', 'internet', 'Egress filtering and outbound allow-list', 'Restrict outbound connections from production to approved destinations. Alert on unexpected outbound traffic that could indicate command-and-control or data exfiltration.', 'Egress policy, firewall rules, alert test', 'Security / IT', 'high'),
  control('internet.server_tokens', 'internet', 'Server banner and error-detail minimisation', 'Hide unnecessary server versions. Return generic errors to clients while preserving internal correlation identifiers and protected logs.', 'Nginx config, HTTP header check, error-handler review', 'Engineering', 'medium', {
    status: 'in_progress',
    evidence: 'docs/security/evidence/2026-11-12-public-header-check.txt',
    note: 'The HTTP redirect disclosed nginx/1.30.4. HTTPS responses disclosed server: nginx. Error middleware still requires a production review.',
  }),

  // L2 — application
  control('application.secure_sdlc', 'application', 'Secure development lifecycle and protected branches', 'Require code review, protected main branches, code-owner approval, signed or traceable release artefacts and separation between development and production deployment authority.', 'Branch-protection export, review policy, release record', 'Engineering', 'high', {
    status: 'in_progress',
    note: 'A CI workflow and release guards exist. Branch protection, mandatory review and deployment-authority separation are not verified in this register.',
  }),
  control('application.dependency_scanning', 'application', 'Dependency and software-composition scanning', 'Scan production and development dependencies for known vulnerabilities. Review reachability and exploitability, not only the count. Block critical findings before release unless an approved exception exists.', 'Lockfile scan, CI result, exception record', 'Engineering', 'high', {
    status: 'in_progress',
    evidence: 'scripts/security-audit.mjs',
    note: 'A repository security audit script is added. A dated dependency scan and remediation record still need to be stored.',
  }),
  control('application.secret_scanning', 'application', 'Secret and credential scanning', 'Prevent secrets from entering source control. Scan commits and build artefacts, revoke exposed credentials immediately and rotate dependent secrets.', 'CI secret scan, repository settings, rotation record', 'Engineering / Security', 'critical', {
    status: 'in_progress',
    evidence: 'scripts/security-audit.mjs',
    note: 'Repository-level pattern checks are added. GitHub secret scanning and push protection have not been verified.',
  }),
  control('application.sast_dast', 'application', 'SAST and DAST testing', 'Run static analysis on application code and dynamic testing against a staging deployment. Test authentication, access control, injection, file upload, session handling and payment webhooks.', 'SAST report, DAST report, remediation tickets', 'Engineering / Security', 'high'),
  control('application.access_control', 'application', 'Broken access control and server-side authorisation', 'Every sensitive route must verify identity and authorisation on the server. A hidden UI control is not authorisation. Test customer-to-customer and user-to-admin boundaries.', 'Route inventory, authorisation tests, code review', 'Engineering', 'critical', {
    status: 'in_progress',
    evidence: 'apps/api/src/middleware/supabase-auth.js; apps/api/src/routes/admin.js',
    note: 'Admin routes use supabaseAuth and assertAdmin. A complete route-by-route authorisation test has not been recorded.',
  }),
  control('application.input_validation', 'application', 'Input validation and output encoding', 'Validate request shape, type, length and allowed values on the server. Use parameterised database access and encode output. Treat uploaded files, webhooks and AI output as untrusted.', 'Validation inventory, test cases, code review', 'Engineering', 'high', {
    status: 'in_progress',
  }),
  control('application.rate_limiting', 'application', 'Rate limits and abuse controls', 'Apply global, authentication-specific, public-write and AI limits. Key limits to the real client through a correctly configured trusted proxy. Test that headers and blocks behave as intended.', 'Rate-limit configuration, load test, alert record', 'Engineering', 'critical', {
    status: 'implemented',
    evidence: 'apps/api/src/middleware/global-rate-limit.js; apps/api/src/middleware/auth-rate-limit.js',
    note: 'A global limiter exists and a dedicated authentication limiter is added. Distributed-store rate limiting and load testing are not recorded.',
  }),
  control('application.bot_protection', 'application', 'Bot detection and automated-abuse controls', 'Protect login, signup, password reset, public forms and API key use from credential stuffing, scraping and automated abuse. Prefer risk-based challenges over permanent CAPTCHA friction.', 'Bot configuration, challenge metrics, false-positive review', 'Engineering / Security', 'high'),
  control('application.upload_safety', 'application', 'File-upload validation and isolated storage', 'Enforce size, count, type and magic-byte checks. Store uploads outside the web root, use non-executable storage and scan untrusted files where supported. Do not trust the client MIME type.', 'Upload policy, validation code, storage configuration', 'Engineering', 'high', {
    status: 'implemented',
    evidence: 'apps/api/src/middleware/file-upload.js',
    note: 'Image magic-byte validation and size limits are present for routes that use this middleware. Coverage of every upload route and malware scanning are not verified.',
  }),
  control('application.headers', 'application', 'Security headers and content security policy', 'Set HSTS, CSP, frame-ancestors or X-Frame-Options, nosniff, a strict referrer policy and permissions policy. Test the public SPA and API separately; avoid duplicate conflicting headers.', 'Header scan, Nginx/API configuration', 'Engineering', 'high', {
    status: 'in_progress',
    evidence: 'docs/security/evidence/2026-11-12-public-header-check.txt',
    note: 'API Helmet headers are present but duplicated by Nginx. The public HTML response did not show HSTS, CSP, frame, referrer or permissions headers on 2026-11-12.',
  }),
  control('application.payment_webhooks', 'application', 'Payment webhook verification and idempotency', 'Verify Stripe and Paddle signatures over the raw body. Reject replay, prevent duplicate processing and reconcile provider records against the company ledger.', 'Webhook verification code, replay test, reconciliation record', 'Engineering / Finance', 'critical', {
    status: 'in_progress',
  }),
  control('application.supply_chain', 'application', 'Build, container and deployment artefact integrity', 'Pin dependencies and actions, protect CI secrets, review lockfile changes and produce traceable deployment artefacts. Do not deploy unreviewed code directly to production.', 'CI configuration, lockfile policy, deployment record', 'Engineering', 'high'),

  // L3 — identity
  control('identity.mfa_all', 'identity', 'MFA across company and administrative systems', 'Require MFA for email, source control, cloud, Supabase, hosting, registrar, payroll, banking, payment and password-manager accounts. Track enrolment by account type.', 'MFA enrolment report, provider configuration', 'IT / Security', 'critical', {
    status: 'in_progress',
    evidence: 'apps/api/src/routes/security.js',
    note: 'The product supports TOTP and WebAuthn for customer accounts. Company-wide MFA enforcement for staff and service providers has not been verified.',
  }),
  control('identity.phishing_resistant', 'identity', 'Phishing-resistant authentication for privileged users', 'Issue two FIDO2 hardware security keys or device-bound passkeys per privileged administrator. Prefer them over SMS. Store one backup key securely offline.', 'Key inventory, enrolment report, recovery test', 'IT / Security', 'critical', {
    status: 'in_progress',
    evidence: 'apps/api/src/routes/security.js',
    note: 'WebAuthn support exists. Hardware keys have not been evidenced as issued, enrolled or tested for administrators.',
  }),
  control('identity.password_manager', 'identity', 'Company password manager and secret-sharing rules', 'Deploy a company password manager with MFA and shared-vault controls. Prohibit passwords in chat, email, documents and source code. Remove access on exit.', 'Password-manager inventory, vault ownership, offboarding check', 'IT / Security', 'high'),
  control('identity.separate_admin', 'identity', 'Separate normal and administrative accounts', 'Administrators use a named privileged account for administration and a separate normal account for email and daily work. Do not share root or administrator credentials.', 'Account inventory, role mapping, login test', 'IT / Security', 'high'),
  control('identity.least_privilege', 'identity', 'Least privilege and role-based access', 'Define roles and entitlements for production, Supabase, hosting, source control, finance, payroll, support and AI tools. Deny by default and require an approval for elevation.', 'Role catalogue, access matrix, approval record', 'Security / IT', 'critical', {
    status: 'in_progress',
    note: 'Admin authorisation exists in application code. A complete role catalogue and provider-level entitlement review are not recorded.',
  }),
  control('identity.privileged_access', 'identity', 'Privileged access management and break-glass recovery', 'Limit who can administer production, databases, DNS, hosting and payment systems. Maintain a tested break-glass procedure with offline recovery material and alerting on use.', 'Privileged-access list, break-glass test, alert record', 'Security / IT', 'critical'),
  control('identity.session_management', 'identity', 'Session lifetime, revocation and device controls', 'Set appropriate session expiry, revoke sessions after compromise or role change, and review active devices. Protect refresh tokens and invalidate them on sign-out or password reset.', 'Session configuration, revocation test, device review', 'Engineering / Security', 'high', {
    status: 'in_progress',
  }),
  control('identity.access_reviews', 'identity', 'Quarterly and privileged access reviews', 'Review privileged access monthly and all workforce access quarterly. Record reviewer, date, findings and removal actions. Remove access on the same day as termination.', 'Access-review records, removal evidence', 'Security / People Operations', 'high'),
  control('identity.offboarding', 'identity', 'Joiner, mover and leaver access control', 'Automate or checklist account creation, role changes and revocation across email, source control, cloud, Supabase, payroll, banking and AI tools. Test the leaver path.', 'Joiner/mover/leaver procedure, test record', 'IT / People Operations', 'critical', {
    status: 'in_progress',
    evidence: 'apps/api/src/data/workforce-compliance.js',
    note: 'A workforce offboarding checklist exists. A completed end-to-end revocation test has not been recorded.',
  }),
  control('identity.recovery', 'identity', 'Account recovery and help-desk verification', 'Use strong recovery methods that do not rely on easily social-engineered information. Train support staff to verify identity before resetting MFA or changing account ownership.', 'Recovery procedure, support script, test record', 'IT / Support', 'high'),
  control('identity.service_accounts', 'identity', 'Service-account inventory and key rotation', 'Inventory service accounts and API keys, restrict their scope, store secrets server-side and rotate on a schedule or after suspected exposure. Remove unused accounts.', 'Service-account inventory, rotation record', 'Engineering / Security', 'high'),

  // L4 — infrastructure, data and AI
  control('infrastructure.database_private', 'infrastructure', 'Database and storage network isolation', 'Do not expose PostgreSQL, Redis, object-store administration or internal dashboards publicly. Restrict database access to approved services and networks and require encrypted connections.', 'Network diagram, firewall rules, connection test', 'Engineering / IT', 'critical', {
    status: 'unverified',
    note: 'The application uses managed Supabase according to repository documentation. Public exposure and network restrictions have not been independently verified.',
  }),
  control('infrastructure.rls', 'infrastructure', 'Row Level Security policies and grants', 'Enable RLS on every exposed Supabase table. Test select, insert, update and delete policies for each role. Keep service-role keys server-side. Review grants as well as policies.', 'RLS audit SQL output, policy tests, grant review', 'Engineering / Database', 'critical', {
    status: 'unverified',
    evidence: 'supabase/security/rls-audit.sql',
    note: 'Repository migrations contain owner policies for many tables. A production audit of every table, grant and operation has not been recorded.',
  }),
  control('infrastructure.service_role', 'infrastructure', 'Service-role and secret key containment', 'Never expose the Supabase service-role key in the React/Vite bundle, mobile app, public repository or logs. Use it only in the API server for explicit administrative operations.', 'Repository scan, bundle scan, key-rotation record', 'Engineering / Security', 'critical', {
    status: 'implemented',
    evidence: 'scripts/security-audit.mjs; apps/api/src/utils/supabaseClient.js',
    note: 'The repository scan checks the web source for service-role exposure. A browser-bundle scan and production key-rotation record are still required.',
  }),
  control('infrastructure.encryption', 'infrastructure', 'Encryption in transit and at rest', 'Enforce TLS for application, database, broker and payment connections. Confirm storage and backup encryption at the provider. Use application-level encryption for broker credentials.', 'Provider encryption evidence, TLS configuration, vault design', 'Engineering / Security', 'critical', {
    status: 'in_progress',
    evidence: 'apps/api/src/utils/vault.js; docs/security/evidence/2026-11-12-tls-check.txt',
    note: 'Broker secrets use AES-256-GCM in the API vault when configured. Supabase at-rest encryption and backup encryption have not been independently verified.',
  }),
  control('infrastructure.secrets', 'infrastructure', 'Secrets management and rotation', 'Store production secrets in a controlled secret store or restricted environment files. Never commit them. Define ownership, rotation and emergency revocation for every critical secret.', 'Secret inventory, access list, rotation schedule', 'Security / Engineering', 'critical', {
    status: 'in_progress',
  }),
  control('infrastructure.backups', 'infrastructure', 'Encrypted, isolated and immutable backups', 'Back up customer data, billing records, configuration and essential documents. Encrypt backups, separate the backup account from production administration, restrict deletion and retain an off-site copy.', 'Backup configuration, encryption evidence, retention policy', 'Engineering / IT', 'critical', {
    status: 'in_progress',
    evidence: 'scripts/db-backup.sh',
    note: 'A local database backup script exists and a pre-deployment archive was taken previously. A production backup schedule, encryption, immutability and separate account are not recorded.',
  }),
  control('infrastructure.restore_tests', 'infrastructure', 'Backup restoration tests', 'Restore into an isolated environment at least monthly. Verify data integrity, application startup and access controls. Record the recovery time and any data loss.', 'Restore test record, integrity check, RTO/RPO measurement', 'Engineering / IT', 'critical'),
  control('infrastructure.retention', 'infrastructure', 'Data classification, retention and deletion', 'Classify customer, trading, identity, payment, investor and employee data. Keep only what is needed, define retention periods and support lawful deletion without destroying required records.', 'Data inventory, retention schedule, deletion test', 'Privacy / Legal / Engineering', 'high'),
  control('infrastructure.broker_tokens', 'infrastructure', 'Broker token protection and read-only scope', 'Use broker OAuth or read-only API keys. Encrypt tokens server-side, scope them to the minimum permission and revoke on disconnect. Never request withdrawal or transfer permission for journaling.', 'Vault code, broker permission review, revocation test', 'Engineering / Security', 'critical', {
    status: 'implemented',
    evidence: 'apps/api/src/utils/vault.js; apps/api/src/routes/brokers.js',
    note: 'Broker secrets are encrypted with AES-256-GCM when VAULT_ENCRYPTION_KEY is configured. Provider permission scope and revocation testing are not recorded.',
  }),
  control('infrastructure.ai_isolation', 'infrastructure', 'AI tenant isolation and prompt-injection defence', 'Separate each customer\'s AI conversation and memory. Treat web content, uploads and tool output as untrusted. Validate tool calls on the server, require approval for consequential actions and prevent one tenant\'s context entering another session.', 'AI architecture review, isolation tests, prompt-injection test', 'Engineering / Security', 'critical', {
    status: 'in_progress',
    note: 'The application stores per-user AI history. Tenant-isolation, prompt-injection, tool-authorisation and data-exfiltration tests have not been recorded.',
  }),
  control('infrastructure.payments', 'infrastructure', 'Payment-data minimisation and provider security', 'Use hosted or PCI-compliant payment components. Do not store card numbers or CVV. Verify webhooks, reconcile transactions and protect refund and payout authority with role-based approval.', 'Payment-flow diagram, provider attestation reference, reconciliation record', 'Finance / Engineering', 'critical'),
  control('infrastructure.logging', 'infrastructure', 'Security-relevant application and database logging', 'Log authentication, authorisation failures, administrative changes, data exports, webhook failures, secret-access events and AI tool actions. Exclude passwords, tokens and unnecessary personal data.', 'Log schema, retention policy, sample review', 'Engineering / Security', 'high', {
    status: 'in_progress',
    evidence: 'apps/api/src/main.js',
    note: 'HTTP request logging exists. A reviewed security-event schema and retention policy are not recorded.',
  }),

  // L5 — detection, response and recovery
  control('detection.central_logs', 'detection', 'Centralised security logging', 'Send security logs from the VPS, application, Supabase, identity provider, source control, WAF, payment provider and endpoints to a controlled destination with restricted access.', 'Log pipeline, destination access list, coverage map', 'Security / Engineering', 'high'),
  control('detection.alerts', 'detection', 'High-priority security alerts', 'Alert on repeated login failures, unusual admin login, privileged-account creation, bulk database export, unexpected deploy, secret exposure, unusual broker activity, WAF spike, malware, backup deletion and unusual refunds.', 'Alert catalogue, test notifications, on-call route', 'Security / IT', 'critical'),
  control('detection.siem', 'detection', 'SIEM or managed detection capability', 'Correlate logs and investigate anomalies. Start with a small managed service or a controlled Wazuh deployment only after sizing the resource impact.', 'SIEM design, data sources, analyst coverage', 'Security', 'high'),
  control('detection.edr', 'detection', 'Endpoint detection and response', 'Protect company laptops with EDR, anti-malware, full-disk encryption, patching, application control and remote wipe. Verify compliance before granting access to sensitive systems.', 'EDR console, device compliance report, wipe test', 'IT / Security', 'critical'),
  control('detection.ir_plan', 'detection', 'Incident response plan and contact tree', 'Maintain a written plan covering detection, triage, containment, credential protection, evidence preservation, eradication, recovery, communication, notification assessment and review.', 'Approved plan, contact tree, distribution record', 'Security / General Counsel', 'critical', {
    status: 'in_progress',
    evidence: 'docs/security/03-INCIDENT-RESPONSE-PLAN.md',
    note: 'A controlled response plan is prepared. Management approval, named alternates and an out-of-hours contact test are not recorded.',
  }),
  control('detection.ir_exercise', 'detection', 'Incident-response exercise', 'Run at least one exercise every six months, including a simulated ransomware or credential-compromise event. Test decision-making, evidence preservation, communications and recovery.', 'Exercise plan, participants, after-action report', 'Security / COO', 'high'),
  control('detection.forensics', 'detection', 'Evidence preservation and forensic readiness', 'Preserve logs and disk evidence before wiping or rebuilding. Record chain of custody and use qualified support for serious incidents. Do not let recovery urgency destroy evidence.', 'Evidence procedure, storage location, exercise record', 'Security / Legal', 'high'),
  control('detection.vulnerability', 'detection', 'Vulnerability management and patch SLAs', 'Track vulnerabilities by severity, exposure and exploitability. Patch critical internet-facing issues urgently, high issues on a defined SLA and document exceptions.', 'Vulnerability register, patch SLA, remediation evidence', 'Security / Engineering', 'high', {
    status: 'in_progress',
  }),
  control('detection.uptime', 'detection', 'Uptime, backup and security-control monitoring', 'Monitor public availability, API health, backup success, certificate expiry, disk capacity and security-agent health. Alert the owner before a control silently fails.', 'Monitoring configuration, alert test, dashboard', 'Engineering / IT', 'high'),
  control('detection.backup_alerts', 'detection', 'Backup failure and deletion alerts', 'Alert immediately on backup failure, unexpected deletion, retention change or a restore test failure. Separate backup-administration rights from application rights.', 'Backup alert configuration, deletion-protection test', 'Engineering / Security', 'critical'),

  // L6 — governance
  control('governance.owner', 'governance', 'Named security accountability', 'The board or CEO assigns a named security owner with authority to stop a release or suspend access. Record deputies for finance, infrastructure, legal and communications.', 'Board or CEO appointment, role description, deputy list', 'Board / CEO', 'critical'),
  control('governance.policies', 'governance', 'Approved security policy set', 'Maintain policies for acceptable use, access, devices, application security, data, backups, suppliers, incident response and awareness. Record approval separately from the existence of a document.', 'Policy index, approval references, acknowledgement record', 'Security / General Counsel', 'high', {
    status: 'in_progress',
    evidence: 'docs/security/00-README.md',
    note: 'A controlled policy and runbook set is prepared. Management adoption and staff acknowledgement are not recorded.',
  }),
  control('governance.risk_register', 'governance', 'Security risk register', 'Maintain risks with likelihood, impact, owner, treatment, target date and review. Accepted risks require a named decision-maker and an expiry date.', 'Risk register, review minutes, acceptance record', 'Security', 'high', {
    status: 'implemented',
    evidence: 'apps/api/src/services/security-programme.js; apps/api/src/data/security-programme.js',
    note: 'The register is implemented with seeded initial risks. Risk review and formal acceptance are not recorded.',
  }),
  control('governance.vendors', 'governance', 'Third-party and supplier risk management', 'Assess critical providers for data access, encryption, MFA, independent assurance, subcontractors, incident notification, termination and access revocation. Do not rely on a badge without scope and exceptions.', 'Vendor register, diligence evidence, contract clauses', 'Security / Legal / Procurement', 'high', {
    status: 'in_progress',
    evidence: 'apps/api/src/services/security-programme.js',
    note: 'A vendor register is implemented. No provider assessment or certification evidence is recorded in it.',
  }),
  control('governance.training', 'governance', 'Security awareness training', 'Require role-based security training at onboarding and annually. Cover phishing, passwords, MFA, devices, data handling, AI use, payment fraud and incident reporting. Record completion.', 'Training plan, completion report, assessment scores', 'Security / People Operations', 'high'),
  control('governance.phishing', 'governance', 'Phishing simulations and reporting culture', 'Run realistic simulations, measure reporting and repeat behaviour, and train rather than punish. Never use simulations to embarrass staff.', 'Simulation plan, results, follow-up training', 'Security / IT', 'medium'),
  control('governance.pen_test', 'governance', 'Independent penetration testing', 'Commission an independent tester to assess the public application, APIs, authentication, tenant isolation, admin functions, file uploads, broker flows, AI boundaries and payment webhooks. Fix critical and high findings before launch.', 'Engagement letter, scope, report, retest evidence', 'Security / CTO', 'critical'),
  control('governance.acceptance', 'governance', 'Security acceptance tests and sign-off', 'Run the documented acceptance tests, record pass/fail evidence and require a qualified reviewer to sign off before expanding access to real customer data.', 'Completed test record, reviewer sign-off, exceptions', 'Security / CTO', 'critical', {
    status: 'in_progress',
    evidence: 'docs/security/10-ACCEPTANCE-TEST-PLAN.md',
    note: 'The test plan and in-product acceptance register are prepared. No independent sign-off is recorded.',
  }),
  control('governance.budget', 'governance', 'Security budget and ownership', 'Approve a planning budget for edge protection, identity, endpoint, monitoring, backups, scanning, testing and incident response. Separate recurring operating cost from one-off assurance work.', 'Approved budget, owner, purchase decisions', 'CFO / CEO', 'high', {
    status: 'in_progress',
    evidence: 'docs/security/01-SECURITY-PROGRAMME.md',
    note: 'Planning ranges are documented. No approved budget or purchase order is recorded.',
  }),
  control('governance.breach_notification', 'governance', 'Breach assessment and notification procedure', 'Assess legal, regulatory, customer and partner notification duties with counsel. Preserve evidence, document decisions and meet contractual and statutory deadlines.', 'Notification matrix, counsel contact, decision template', 'General Counsel / Security', 'critical', {
    status: 'in_progress',
    evidence: 'docs/security/03-INCIDENT-RESPONSE-PLAN.md',
  }),
  control('governance.certification', 'governance', 'Certification and assurance claims', 'Do not claim ISO 27001, SOC 2, PCI DSS, an audit or a penetration test until the independent evidence exists. Record scope, period, exceptions and the exact claim that may be made.', 'Certificate or report, scope, public-claim review', 'General Counsel / Security', 'high', {
    status: 'in_progress',
    evidence: 'docs/security/14-ASSURANCE-AND-CERTIFICATION.md',
    note: 'The programme explicitly prohibits unearned certification claims. No certificate, attestation or completed penetration test is recorded.',
  }),
  control('governance.board_reporting', 'governance', 'Board and executive security reporting', 'Report material incidents, risk posture, audit findings, control gaps and budget needs to the board or CEO at least quarterly. Record decisions and accountable owners.', 'Board pack, minutes, decision log', 'CEO / Security', 'high'),
]);

export const SECURITY_ACCEPTANCE_TESTS = Object.freeze([
  { id: 'accept.ports', title: 'External port and service exposure', expected: 'No unintended public SSH, database, Node, Redis, dashboard or management service is reachable.', controls: ['internet.origin_lockdown', 'internet.network_firewall', 'internet.host_firewall'] },
  { id: 'accept.ssh', title: 'Public SSH access', expected: 'A public SSH connection is blocked; approved administrators connect over the private access path with individual accounts and MFA.', controls: ['internet.origin_lockdown', 'identity.privileged_access'] },
  { id: 'accept.database', title: 'Direct database exposure', expected: 'A direct public database connection is blocked; application access is restricted, encrypted and logged.', controls: ['infrastructure.database_private'] },
  { id: 'accept.edge', title: 'Application access through the security edge', expected: 'Customers reach the application through the approved edge; direct origin access is denied or authenticated.', controls: ['internet.waf', 'internet.cdn_proxy'] },
  { id: 'accept.private_access', title: 'Administrator private access', expected: 'An authorised device reaches the server over the private network. An unauthorised device is denied.', controls: ['internet.origin_lockdown', 'identity.privileged_access'] },
  { id: 'accept.tenant', title: 'Customer A to Customer B isolation', expected: 'Customer A cannot read, update or delete Customer B records through the UI, API or direct Supabase client.', controls: ['application.access_control', 'infrastructure.rls'] },
  { id: 'accept.api_auth', title: 'Unauthorised and expired API requests', expected: 'Protected API routes reject missing, expired, malformed and insufficiently privileged tokens with 401 or 403.', controls: ['application.access_control', 'identity.session_management'] },
  { id: 'accept.secrets', title: 'Leaked or revoked credential', expected: 'A revoked or rotated credential no longer works, and the exposure is recorded and investigated.', controls: ['application.secret_scanning', 'infrastructure.secrets'] },
  { id: 'accept.restore', title: 'Backup restoration', expected: 'A backup restores into an isolated environment with verified data integrity and access controls.', controls: ['infrastructure.restore_tests'] },
  { id: 'accept.alerts', title: 'Security monitoring failure', expected: 'Stopping a monitoring or backup agent generates an alert to the named owner.', controls: ['detection.uptime', 'detection.alerts'] },
  { id: 'accept.incident', title: 'Simulated critical incident', expected: 'The response team contains the event, preserves evidence, communicates and records lessons within the documented process.', controls: ['detection.ir_plan', 'detection.ir_exercise'] },
  { id: 'accept.webhook', title: 'Payment webhook forgery and replay', expected: 'An unsigned, invalid or replayed webhook is rejected without changing billing state.', controls: ['application.payment_webhooks'] },
  { id: 'accept.ai', title: 'AI tenant and prompt-injection boundary', expected: 'A malicious prompt or uploaded document cannot retrieve another customer\'s context, expose system secrets or execute a consequential action without approval.', controls: ['infrastructure.ai_isolation'] },
  { id: 'accept.headers', title: 'Public and API security headers', expected: 'The public SPA and API return consistent HSTS, CSP, frame, content-type, referrer and permissions policies without conflicting duplicates.', controls: ['application.headers'] },
]);

export const SECURITY_RISKS = Object.freeze([
  {
    id: 'risk-origin-exposure',
    title: 'Public origin may be reachable without the security edge',
    description: 'DNS currently resolves to a Hostinger address and the origin responds directly. Without WAF, DDoS absorption and origin lockdown, an attacker may bypass edge controls or attack the server directly.',
    category: 'Internet and network',
    likelihood: 4,
    impact: 5,
    owner: 'Security owner not appointed',
    treatment: 'Move public hostnames behind an approved edge or tunnel, restrict origin ingress to the edge, test direct-origin access and configure WAF/DDoS controls in staging first.',
    relatedControls: ['internet.waf', 'internet.ddos', 'internet.cdn_proxy', 'internet.origin_lockdown'],
    status: 'open',
  },
  {
    id: 'risk-rls-unverified',
    title: 'Production Supabase RLS and grants are not fully audited',
    description: 'Repository migrations contain owner policies, but a production audit of every table, grant and read/write operation is not recorded. A missing or overly broad policy could expose customer records.',
    category: 'Data and database',
    likelihood: 4,
    impact: 5,
    owner: 'Engineering',
    treatment: 'Run the read-only RLS audit, review every exposed table and grant, write tests for tenant isolation and record the dated result. Do not apply policy changes without a staging test and rollback plan.',
    relatedControls: ['infrastructure.rls', 'application.access_control'],
    status: 'open',
  },
  {
    id: 'risk-admin-mfa',
    title: 'Administrator MFA and hardware-key enforcement are not verified',
    description: 'The product supports TOTP and WebAuthn, but company-wide MFA and two phishing-resistant keys per privileged administrator are not evidenced. A stolen password or session could expose administrative functions.',
    category: 'Identity and access',
    likelihood: 4,
    impact: 5,
    owner: 'IT / Security',
    treatment: 'Inventory administrative accounts, enforce MFA at the identity and hosting providers, issue two hardware keys per privileged user and test recovery.',
    relatedControls: ['identity.mfa_all', 'identity.phishing_resistant', 'identity.privileged_access'],
    status: 'open',
  },
  {
    id: 'risk-monitoring',
    title: 'No central security monitoring or tested on-call alerts',
    description: 'Application request logs exist, but centralised security events, alert thresholds and an out-of-hours route are not recorded. An intrusion could remain undetected.',
    category: 'Detection and response',
    likelihood: 4,
    impact: 4,
    owner: 'Security / Engineering',
    treatment: 'Define the security-event schema, centralise logs, configure high-priority alerts, test notification delivery and assign an on-call owner.',
    relatedControls: ['infrastructure.logging', 'detection.central_logs', 'detection.alerts', 'detection.uptime'],
    status: 'open',
  },
  {
    id: 'risk-restore',
    title: 'Backup restoration has not been tested against recovery objectives',
    description: 'A local backup script and a pre-deployment archive exist, but recurring production backups, encryption, immutability and a measured restore test are not recorded.',
    category: 'Recovery',
    likelihood: 3,
    impact: 5,
    owner: 'Engineering / IT',
    treatment: 'Configure encrypted recurring backups in a separate account, restrict deletion, restore into isolation and record achieved RPO/RTO. Proposed targets are not current capabilities.',
    relatedControls: ['infrastructure.backups', 'infrastructure.restore_tests', 'detection.backup_alerts'],
    status: 'open',
  },
  {
    id: 'risk-headers',
    title: 'Public HTML is missing reviewed security headers',
    description: 'The API returns Helmet headers, but the public HTML response did not show HSTS, CSP, frame, referrer or permissions policies on 2026-11-12. Nginx and API headers can also duplicate.',
    category: 'Application security',
    likelihood: 3,
    impact: 3,
    owner: 'Engineering',
    treatment: 'Apply a reviewed Nginx header set, validate the content security policy against the actual application, remove duplicate headers and record a post-change header scan.',
    relatedControls: ['application.headers', 'internet.tls'],
    status: 'open',
  },
  {
    id: 'risk-email-domain',
    title: 'Email domain protection is not enforcing',
    description: 'SPF uses a soft fail and DMARC is p=none. Without DKIM verification and an enforcing DMARC policy, impersonation and phishing risk is higher.',
    category: 'Internet and network',
    likelihood: 3,
    impact: 4,
    owner: 'IT / Security',
    treatment: 'Verify SPF, DKIM and DMARC alignment with the actual mail provider, monitor reports, then move DMARC to quarantine and reject after a controlled observation period.',
    relatedControls: ['internet.dns', 'governance.training', 'governance.phishing'],
    status: 'open',
  },
  {
    id: 'risk-vendor',
    title: 'Critical suppliers have not been risk-assessed in the register',
    description: 'Hosting, database, email, payment and AI providers may receive customer or company data. No dated provider assessment or contract security review is recorded in the vendor register.',
    category: 'Third-party risk',
    likelihood: 3,
    impact: 4,
    owner: 'Security / Legal',
    treatment: 'Inventory critical providers, record data categories and assurance evidence, review contract incident and termination terms, and set review dates.',
    relatedControls: ['governance.vendors'],
    status: 'open',
  },
  {
    id: 'risk-ai',
    title: 'AI isolation and prompt-injection controls are not independently tested',
    description: 'Customer AI contexts, uploaded files and tool calls create data-leakage and unauthorised-action risk. Per-user storage exists, but adversarial testing is not recorded.',
    category: 'AI security',
    likelihood: 3,
    impact: 5,
    owner: 'Engineering / Security',
    treatment: 'Test tenant isolation, system-prompt leakage, prompt injection, malicious uploads and tool-call authorisation. Require human approval for consequential actions.',
    relatedControls: ['infrastructure.ai_isolation', 'application.input_validation'],
    status: 'open',
  },
  {
    id: 'risk-supply-chain',
    title: 'Supply-chain and dependency exposure is not baselined',
    description: 'Dependency and build scanning are not recorded as a dated release gate. A compromised package or leaked CI secret could enter production.',
    category: 'Application security',
    likelihood: 3,
    impact: 4,
    owner: 'Engineering',
    treatment: 'Enable dependency, secret and code scanning in CI, protect release credentials, review lockfile changes and record a dated baseline with exceptions.',
    relatedControls: ['application.dependency_scanning', 'application.secret_scanning', 'application.supply_chain'],
    status: 'open',
  },
  {
    id: 'risk-pen-test',
    title: 'No independent penetration test or security acceptance sign-off',
    description: 'The programme defines tests, but no independent tester has assessed the public application, APIs, tenant isolation, admin functions, broker flows or AI boundaries.',
    category: 'Assurance',
    likelihood: 4,
    impact: 5,
    owner: 'Security / CTO',
    treatment: 'Commission an independent test with a written scope, fix critical and high findings, retest and record a qualified sign-off before expanding access to real customer data.',
    relatedControls: ['governance.pen_test', 'governance.acceptance'],
    status: 'open',
  },
]);

export const SECURITY_STACK = Object.freeze([
  { id: 'stack.cloudflare', area: 'WAF, DNS, DDoS, bot protection, rate limits', product: 'Cloudflare', priority: 'critical', status: 'proposed', note: 'Proposed internet-facing security edge. No account, plan or configuration is evidenced in this register.' },
  { id: 'stack.tunnel', area: 'Origin hiding and outbound tunnel', product: 'Cloudflare Tunnel', priority: 'critical', status: 'proposed', note: 'Target design keeps public web ports closed and exposes only the local reverse proxy.' },
  { id: 'stack.tailscale', area: 'Private administrator access', product: 'Tailscale', priority: 'critical', status: 'proposed', note: 'Target design for SSH and administrative access. Requires an individual-account and MFA review.' },
  { id: 'stack.hostinger', area: 'VPS hosting and provider firewall', product: 'Hostinger VPS', priority: 'critical', status: 'current', note: 'Current production host according to deployment documentation. Provider firewall and snapshot encryption need verification.' },
  { id: 'stack.supabase', area: 'Managed database, authentication and storage', product: 'Supabase Cloud', priority: 'critical', status: 'current', note: 'Current managed data layer according to repository documentation. RLS, grants and backup configuration need a dated audit.' },
  { id: 'stack.identity', area: 'Workforce identity and conditional access', product: 'Microsoft Entra ID or Google Workspace', priority: 'high', status: 'proposed', note: 'Choose one primary identity provider. Do not create disconnected accounts across providers.' },
  { id: 'stack.password-manager', area: 'Passwords and secret sharing', product: '1Password Business or equivalent', priority: 'high', status: 'proposed', note: 'Requires MFA, vault ownership and offboarding controls.' },
  { id: 'stack.edr', area: 'Endpoint protection and response', product: 'Microsoft Defender for Business, CrowdStrike Falcon or SentinelOne', priority: 'high', status: 'proposed', note: 'Choose one platform and configure it properly. Do not buy three overlapping products.' },
  { id: 'stack.wazuh', area: 'Security monitoring and file-integrity alerts', product: 'Wazuh or a managed detection service', priority: 'high', status: 'proposed', note: 'A separate monitoring host is preferable if the production VPS has limited resources.' },
  { id: 'stack.github', area: 'Source control and supply-chain security', product: 'GitHub private repositories with secret scanning, Dependabot and branch protection', priority: 'critical', status: 'current', note: 'Repository usage is evidenced. Provider security settings and branch protection are not verified.' },
  { id: 'stack.snyk', area: 'Dependency and container scanning', product: 'Snyk or equivalent', priority: 'high', status: 'proposed', note: 'A local audit script is not a substitute for a maintained scanning service.' },
  { id: 'stack.sentry', area: 'Application error and release monitoring', product: 'Sentry or equivalent', priority: 'medium', status: 'proposed', note: 'Useful for abnormal application behaviour. Scrub personal data before sending events.' },
  { id: 'stack.yubikey', area: 'Phishing-resistant administrator authentication', product: 'YubiKey 5 NFC', priority: 'critical', status: 'proposed', note: 'Two keys per privileged administrator: one primary and one securely stored backup.' },
  { id: 'stack.pentest', area: 'Independent application and infrastructure testing', product: 'Independent penetration-testing firm', priority: 'critical', status: 'proposed', note: 'Requires a written scope, rules of engagement, evidence handling and retest.' },
  { id: 'stack.ir-retainer', area: 'Incident-response support', product: 'Qualified incident-response retainer', priority: 'high', status: 'proposed', note: 'Confirm availability, escalation terms and forensic evidence handling before an incident.' },
]);

export const SECURITY_BUDGET = Object.freeze([
  { area: 'WAF, DNS and DDoS', planning: '$0–$500/month', note: 'Depends on plan, traffic and managed-rule tier.' },
  { area: 'Workforce identity and MFA', planning: '$50–$250/month', note: 'Depends on employee count and identity tier.' },
  { area: 'Password management', planning: '$30–$150/month', note: 'Business plan and seat count.' },
  { area: 'Endpoint protection', planning: '$50–$300/month', note: 'Per-device licensing and EDR tier.' },
  { area: 'Monitoring and SIEM', planning: '$100–$700/month', note: 'Log volume and managed-service coverage drive cost.' },
  { area: 'Backups and recovery', planning: '$50–$300/month', note: 'Storage, retention, immutability and separate-account design.' },
  { area: 'Vulnerability scanning', planning: '$100–$500/month', note: 'Repository, container and dynamic scanning.' },
  { area: 'Independent penetration test', planning: '$5,000–$20,000 per engagement', note: 'Scope, depth, retest and reporting vary.' },
  { area: 'Incident-response retainer', planning: '$3,000–$15,000/year', note: 'Availability, response time and forensic support vary.' },
]);

export const SECURITY_ROLES = Object.freeze([
  { role: 'Board / CEO', responsibility: 'Owns security accountability, approves risk acceptance and material budget, receives quarterly reporting.' },
  { role: 'CISO / Security owner', responsibility: 'Owns strategy, control register, risk register, incident command and assurance plan.' },
  { role: 'Security Engineer', responsibility: 'Maintains edge, firewalls, cloud, private access, backups and infrastructure hardening.' },
  { role: 'Application Security Engineer', responsibility: 'Owns secure development, API authorisation, dependency and secret scanning, and application testing.' },
  { role: 'Security Operations Analyst', responsibility: 'Monitors alerts, triages suspicious activity, preserves evidence and coordinates response.' },
  { role: 'Data Protection / Privacy Lead', responsibility: 'Owns personal-data inventory, retention, breach assessment and privacy notices.' },
  { role: 'General Counsel', responsibility: 'Advises on notification, contractual, employment, securities and regulatory obligations.' },
  { role: 'Independent Penetration Tester', responsibility: 'Tests the production-like environment from an attacker perspective under written rules of engagement.' },
]);

export const SECURITY_ROADMAP = Object.freeze([
  {
    phase: 'Days 1–14',
    title: 'Lock down the company',
    outcomes: [
      'Enable MFA and hardware-key protection for administrators.',
      'Secure email, domain registrar, DNS and hosting accounts.',
      'Inventory the public origin, ports, databases and administrative paths.',
      'Review Supabase tables, RLS policies and grants with the read-only audit.',
      'Remove exposed secrets and rotate any credential that may have been exposed.',
      'Protect source control and production deployment permissions.',
      'Configure encrypted backups and a restoration test.',
    ],
    controlIds: ['identity.mfa_all', 'identity.phishing_resistant', 'internet.dns', 'internet.origin_lockdown', 'infrastructure.rls', 'application.secret_scanning', 'application.secure_sdlc', 'infrastructure.backups'],
  },
  {
    phase: 'Days 15–30',
    title: 'Secure the application',
    outcomes: [
      'Apply a reviewed public security-header set and validate the CSP.',
      'Test authentication, password recovery, session management and admin authorisation.',
      'Test customer-to-customer data isolation through the UI, API and Supabase client.',
      'Test broker permissions, token revocation and webhook signature verification.',
      'Run dependency, secret and source-code scans and fix critical findings.',
      'Commission an independent application penetration test.',
      'Fix critical and high findings before real customer data expands.',
    ],
    controlIds: ['application.headers', 'application.access_control', 'infrastructure.rls', 'infrastructure.broker_tokens', 'application.payment_webhooks', 'application.dependency_scanning', 'governance.pen_test'],
  },
  {
    phase: 'Days 31–60',
    title: 'Build detection and response',
    outcomes: [
      'Define the security-event schema and centralise logs.',
      'Configure high-priority alerts and test out-of-hours delivery.',
      'Deploy endpoint protection to company devices.',
      'Adopt the incident-response plan and test the contact tree.',
      'Restore a backup into isolation and record achieved recovery time.',
      'Train employees, developers and support staff.',
      'Assess critical suppliers and record evidence and review dates.',
    ],
    controlIds: ['infrastructure.logging', 'detection.central_logs', 'detection.alerts', 'detection.edr', 'detection.ir_plan', 'infrastructure.restore_tests', 'governance.training', 'governance.vendors'],
  },
  {
    phase: 'Days 61–90',
    title: 'Independent assurance',
    outcomes: [
      'Conduct a second security assessment and retest prior findings.',
      'Test disaster recovery and the ransomware scenario.',
      'Run a phishing simulation and follow-up training.',
      'Review privileged and workforce access.',
      'Close outstanding vulnerabilities or record approved exceptions.',
      'Produce a formal security assessment report and board summary.',
      'Approve the ongoing security budget and monitoring schedule.',
    ],
    controlIds: ['governance.pen_test', 'detection.ir_exercise', 'governance.phishing', 'identity.access_reviews', 'detection.vulnerability', 'governance.acceptance', 'governance.board_reporting', 'governance.budget'],
  },
]);

export const SECURITY_STANDARDS = Object.freeze([
  { standard: 'NIST Cybersecurity Framework 2.0', application: 'Overall governance and risk management across Govern, Identify, Protect, Detect, Respond and Recover.' },
  { standard: 'CIS Critical Security Controls', application: 'Practical technical safeguards for assets, identity, data, devices, network and monitoring.' },
  { standard: 'ISO/IEC 27001', application: 'Target information-security management system. Not certified; no certificate is recorded.' },
  { standard: 'OWASP Top 10:2025', application: 'Web application risks including broken access control, misconfiguration, supply-chain failures, cryptographic failures, injection and authentication failures.' },
  { standard: 'OWASP API Security Top 10', application: 'API authorisation, object-level access, rate limits, inventory and unsafe third-party consumption.' },
  { standard: 'SOC 2 Trust Services Criteria', application: 'Target customer-assurance framework. No SOC 2 report or attestation is recorded.' },
  { standard: 'PCI DSS', application: 'Payment-card security through a compliant provider. Do not claim merchant compliance unless the applicable assessment exists.' },
]);

export const SECURITY_DOCUMENTS = Object.freeze([
  { id: 'programme', title: 'Security programme and governance', file: '01-SECURITY-PROGRAMME.md', summary: 'Scope, framework, roles, budget, technology shortlist and 90-day plan.' },
  { id: 'zero-trust', title: 'Zero-trust architecture', file: '02-ZERO-TRUST-ARCHITECTURE.md', summary: 'Target network and application architecture, trust boundaries and deployment sequence.' },
  { id: 'incident-response', title: 'Incident response plan', file: '03-INCIDENT-RESPONSE-PLAN.md', summary: 'Severity, command roles, containment, evidence, notification, recovery and exercise.' },
  { id: 'identity-access', title: 'Identity and access policy', file: '04-IDENTITY-AND-ACCESS-POLICY.md', summary: 'MFA, phishing-resistant authentication, least privilege, reviews and offboarding.' },
  { id: 'devices', title: 'Device and endpoint policy', file: '05-DEVICE-AND-ENDPOINT-POLICY.md', summary: 'Company devices, encryption, patching, acceptable use, loss and return.' },
  { id: 'appsec', title: 'Application and API security standard', file: '06-APPLICATION-AND-API-SECURITY-STANDARD.md', summary: 'Secure development, OWASP, release gates, secrets, headers and API controls.' },
  { id: 'data-ai', title: 'Data, database, broker and AI security', file: '07-DATA-DATABASE-BROKER-AND-AI-SECURITY.md', summary: 'RLS, service roles, customer isolation, broker tokens, payments, AI and retention.' },
  { id: 'backup-dr', title: 'Backup and disaster recovery', file: '08-BACKUP-AND-DISASTER-RECOVERY.md', summary: 'Proposed RPO/RTO, backup layers, restoration testing and recovery governance.' },
  { id: 'vendor', title: 'Vendor and supplier security', file: '09-VENDOR-AND-SUPPLIER-SECURITY.md', summary: 'Criticality, due diligence, contract terms, review and termination.' },
  { id: 'awareness', title: 'Security awareness and phishing', file: '10-SECURITY-AWARENESS-AND-PHISHING.md', summary: 'Employee rules, training, simulations, reporting and executive participation.' },
  { id: 'acceptance', title: 'Security acceptance test plan', file: '11-ACCEPTANCE-TEST-PLAN.md', summary: 'The tests and evidence required before claiming infrastructure security.' },
  { id: 'hardening', title: 'Production hardening runbook', file: '12-PRODUCTION-HARDENING-RUNBOOK.md', summary: 'Staged UFW, SSH, Nginx, Cloudflare Tunnel and recovery procedure with rollback.' },
  { id: 'cloudflare', title: 'Cloudflare and network controls', file: '13-CLOUDFLARE-AND-NETWORK-CONTROLS.md', summary: 'DNS, WAF, DDoS, rate limits, tunnel and origin-lockdown configuration.' },
  { id: 'assurance', title: 'Assurance and certification claims', file: '14-ASSURANCE-AND-CERTIFICATION.md', summary: 'What may and may not be claimed about audits, certifications and tests.' },
]);

export const SECURITY_NOTES = Object.freeze([
  'No firewall, antivirus product or certification guarantees that a company will never be breached. The objective is prevention, detection, containment, recovery and protection of customer information.',
  'A control is not complete because a product was purchased. It is complete when configuration, ownership, testing and evidence are recorded.',
  'Do not copy a Cloudflare IP range from an old blog. Use the provider’s current official list and verify IPv4 and IPv6.',
  'Do not expose SSH, PostgreSQL, Redis, Node.js or internal dashboards to the public internet. Keep a recovery session open while changing firewall rules.',
  'Docker can bypass ordinary UFW filtering for published ports. If Docker is used, review its forwarding chains and published ports explicitly.',
  'Do not claim ISO 27001 certification, SOC 2 attestation, PCI DSS compliance or a completed penetration test until the independent evidence exists and is recorded.',
  'Treat external web content, uploaded files and AI tool output as untrusted. Require human approval for consequential financial or compliance actions.',
  'Preserve logs and evidence before wiping or rebuilding a compromised system. Recovery urgency must not destroy forensic evidence.',
]);
