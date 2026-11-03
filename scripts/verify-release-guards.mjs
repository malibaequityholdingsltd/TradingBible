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
import { readFileSync } from 'node:fs';
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

if (failures.length) {
	console.error(`Release guards FAILED (${failures.length}):`);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}
console.log('Release guards OK: PWA, DocuSign, TBC, exam, translation, and curated-path controls are intact.');
