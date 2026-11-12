#!/usr/bin/env node
/**
 * Release guards for the controls that must not silently regress:
 * - PWA updates wait for the user instead of activating behind a stale tab.
 * - Demo DocuSign credentials cannot execute in production.
 * - TBC launch flags stay off by default.
 * - Academy lessons never leak the server-side exam bank.
 * - The final exam stays gated at 80% after every lesson.
 * - Lesson translations are cached, not regenerated on every play.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const failures = [];

function check(name, condition, detail = '') {
	if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const sw = read('apps/web/public/sw.js');
check('service worker version is 1.5.2', sw.includes("tradingbible-v1.5.2"));
const installBlock = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('activate'"));
check('service worker install does not skipWaiting', !installBlock.includes('self.skipWaiting()'));
check('service worker accepts SKIP_WAITING message', sw.includes('SKIP_WAITING'));

const pwa = read('apps/web/src/components/PwaStatus.jsx');
check('PWA checks for updates on visibility', pwa.includes('reg.update()'));
check('PWA prompts before reload', pwa.includes('waitingWorker') && pwa.includes('SKIP_WAITING'));

const docusign = read('apps/api/src/services/docusign.js');
check('DocuSign blocks demo credentials in production', docusign.includes('demoInProduction'));
check('DocuSign createEnvelope enforces the demo guard', docusign.includes("docusign_demo_in_production"));
check('DocuSign sendEnvelope enforces the demo guard', (docusign.match(/docusign_demo_in_production/g) || []).length >= 2);

const deploy = read('deploy/deploy.sh');
for (const flag of [
	'TBC_ISSUED=false',
	'TBC_SALE_ENABLED=false',
	'TBC_TRANSFER_ENABLED=false',
	'TBC_STAKING_ENABLED=false',
	'TBC_GOVERNANCE_ENABLED=false',
	'TBC_MIGRATION_ENABLED=false',
	'TBC_CHAIN_ENABLED=false',
	'DOCUSIGN_SEND_ON_CREATE=false',
]) {
	check(`deploy default ${flag}`, deploy.includes(flag));
}

const tbc = read('apps/api/src/routes/tbc.js');
for (const capability of ['saleEnabled', 'stakingEnabled', 'governanceEnabled', 'migrationEnabled']) {
	const line = tbc.split('\n').find((l) => l.includes(capability));
	check(`TBC ${capability} is issued-gated`, Boolean(line && line.includes('issued &&')), line?.trim());
}

const tokens = read('apps/web/src/styles/tokens.css');
check('dark navigation glyph is white', tokens.includes('--tb-nav-glyph: #ffffff'));
check('light navigation glyph is near-black', tokens.includes('--tb-nav-glyph: #17181c'));
check('navigation medallions use the theme glyph variable', tokens.includes('color: var(--ios-glyph, var(--ios-ink))'));
const appLayout = read('apps/web/src/components/AppLayout.jsx');
const adminLayout = read('apps/web/src/components/AdminLayout.jsx');
const exchangeCss = read('apps/web/src/styles/exchange.css');
check('user navigation uses theme contrast glyphs', appLayout.includes('ex-nav-item') && exchangeCss.includes('.ex-nav-item.is-active svg { color: var(--ex-text); }'));
check('user mobile dock uses theme contrast glyphs', appLayout.includes('ex-mobile-dock__item') && exchangeCss.includes('html.light .ex-mobile-dock__item.is-active svg { color: #0a0a0f; }'));
check('admin dock/More use contrast navigation glyphs', (adminLayout.match(/glyph="contrast"/g) || []).length >= 3);

const academy = read('apps/api/src/routes/academy.js');
check('Academy exam pass mark is 80', academy.includes('EXAM_PASS_PERCENT = 80'));
check('Academy exam is locked until lessons complete', academy.includes('remaining > 0'));
check('Academy lesson response strips quiz + translations', academy.includes('const { quiz, translations, ...rest } = content'));
check('Academy translation returns cached copy', academy.includes('cached: true'));
check('Academy translation persists translations', academy.includes('translations: {') && academy.includes('[lang]: translated'));

const academyApi = read('apps/api/src/api/academy.js');
check('Academy curricula are exported for parity checks', academyApi.includes('export const DEFAULT_CURRICULA'));
check('Curated curricula are seeded without model latency', read('apps/api/src/routes/academy.js').includes('const curated = DEFAULT_CURRICULA[pathKey]'));

// Investor letters: separate audience, server gate, no unsafe retry.
const investor = read('apps/api/src/services/investor-letters.js');
check('investor letters require a dedicated unsubscribe secret', investor.includes('unsubscribeSecretConfigured') && investor.includes('INVESTOR_LETTERS_SECRET'));
check('investor letters block retry after delivery', investor.includes('delivered > 0') && investor.includes("!['prepared', 'failed']"));
check('investor letters keep the Reg CF qualification gate', investor.includes("config.regCfStatus !== 'qualified'") && investor.includes('REG_CF_INTERMEDIARY'));
check('investor letters route is mounted', read('apps/api/src/routes/index.js').includes("router.use('/investor-letters'"));
check('investor letters admin page is routed', read('apps/web/src/App.jsx').includes('/admin/investor-letters'));
check('investor letters navigation is registered', read('apps/web/src/lib/adminRoutes.js').includes("to: '/admin/investor-letters'"));

// Workforce compliance: controlled register, documentation and route.
const workforce = read('apps/api/src/services/workforce.js');
const workforceData = read('apps/api/src/data/workforce-compliance.js');
check('workforce register persists with 0600 mode', workforce.includes('mode: 0o600') && workforce.includes('chmod(STORE_PATH, 0o600)'));
check('workforce register has 19 launch controls', (workforceData.match(/employerItemId:/g) || []).length === 19);
check('workforce register distinguishes US and Nigeria employee items', workforceData.includes("jurisdiction: 'US'") && workforceData.includes("jurisdiction: 'NG'"));
check('workforce benefits remain proposed', workforceData.includes("status: 'proposed'") && workforceData.includes('proposedBenefitsBoundary'));
check('workforce route is mounted', read('apps/api/src/routes/index.js').includes("router.use('/workforce'"));
check('workforce admin page is routed', read('apps/web/src/App.jsx').includes('/admin/workforce'));
check('workforce navigation is registered', read('apps/web/src/lib/adminRoutes.js').includes("to: '/admin/workforce'"));
check('workforce document builder is present', existsSync(resolve(root, 'scripts/build-workforce-documents.mjs')) && existsSync(resolve(root, 'scripts/build-workforce-documents.py')));
const hrManifestPath = resolve(root, 'apps/api/storage/hr-documents/manifest.json');
check('workforce document manifest exists', existsSync(hrManifestPath));
if (existsSync(hrManifestPath)) {
  const hrManifest = JSON.parse(readFileSync(hrManifestPath, 'utf8'));
  check('workforce document pack has 12 documents', Array.isArray(hrManifest.documents) && hrManifest.documents.length === 12, String(hrManifest.documents?.length));
  for (const doc of hrManifest.documents || []) {
    check(`workforce document ${doc.id} has DOCX`, existsSync(resolve(root, 'apps/api/storage/hr-documents', doc.docx)));
    check(`workforce document ${doc.id} has PDF`, existsSync(resolve(root, 'apps/api/storage/hr-documents', doc.pdf)));
  }
}
const hrSources = ['01-EMPLOYEE-HANDBOOK.md', '02-EMPLOYMENT-CONTRACT-US.md', '03-EMPLOYMENT-CONTRACT-NIGERIA.md', '08-PAYROLL-AND-BENEFITS-FRAMEWORK.md'];
for (const file of hrSources) {
  const source = resolve(root, 'docs/hr', file);
  check(`workforce source ${file} exists`, existsSync(source));
  if (existsSync(source)) {
    const text = readFileSync(source, 'utf8');
    check(`workforce source ${file} has no draft label`, !/\bdraft\b/i.test(text));
  }
}

if (failures.length) {
	console.error(`Release guards FAILED (${failures.length}):`);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}
console.log('Release guards OK: PWA, DocuSign, TBC, exam, translation, and curated-path controls are intact.');
