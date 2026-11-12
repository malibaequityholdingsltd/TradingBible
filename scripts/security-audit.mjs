#!/usr/bin/env node
/**
 * Repository security audit.
 *
 * This is a fast preflight, not a substitute for a maintained SAST, dependency
 * scanner or independent penetration test. It checks source-controlled files
 * for common credential and configuration mistakes and confirms that the
 * expected server-side guards are present.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function trackedFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'buffer' });
    return output.toString('utf8').split('\0').filter(Boolean);
  } catch {
    // CI or a source archive may not have git metadata. Fall back to a small
    // explicit source list rather than silently passing.
    warn('git metadata unavailable; scanned a reduced file set.');
    return [
      'apps/api/src/main.js',
      'apps/api/src/routes/index.js',
      'apps/api/src/routes/security.js',
      'apps/api/src/middleware/auth-rate-limit.js',
      'apps/api/src/middleware/global-rate-limit.js',
      'apps/api/src/utils/supabaseClient.js',
      'apps/api/src/utils/vault.js',
      'apps/web/src/lib/pocketbaseClient.js',
      'package.json',
    ].filter((path) => existsSync(resolve(root, path)));
  }
}

const files = trackedFiles();
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.conf', '.sh']);
const skipPath = (path) => (
  path === 'package-lock.json'
  || path.startsWith('node_modules/')
  || path.startsWith('dist/')
  || path.endsWith('.md')
  || path.endsWith('.example')
  || path.endsWith('.png')
  || path.endsWith('.jpg')
  || path.endsWith('.jpeg')
  || path.endsWith('.webp')
  || path.endsWith('.pdf')
  || path.endsWith('.docx')
  || path.endsWith('.zip')
  || path.endsWith('.tar.gz')
);

const trackedEnv = files.filter((path) => /(^|\/)\.env(\.|$)/.test(path) && !path.endsWith('.env.example'));
if (trackedEnv.length) fail(`environment files must not be tracked: ${trackedEnv.join(', ')}`);

const gitignore = existsSync(resolve(root, '.gitignore')) ? read('.gitignore') : '';
if (!/(^|\n)\.env(\n|$)/.test(gitignore)) fail('.gitignore must ignore .env files');
if (!gitignore.includes('apps/api/.env')) fail('.gitignore must ignore apps/api/.env');
if (!gitignore.includes('apps/web/.env')) fail('.gitignore must ignore apps/web/.env');

const secretPatterns = [
  { name: 'Stripe live secret key', re: /sk_live_[A-Za-z0-9]{12,}/ },
  { name: 'Stripe live restricted key', re: /rk_live_[A-Za-z0-9]{12,}/ },
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'GitHub fine-grained token', re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'private key block', re: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'Paddle live key', re: /pdl_live_[A-Za-z0-9_-]{12,}/ },
  { name: 'generic bearer secret assignment', re: /(?:SECRET|TOKEN|PASSWORD|API_KEY)\s*=\s*['"][A-Za-z0-9_\-]{32,}['"]/ },
];

const webServiceRolePattern = /SUPABASE_SERVICE_ROLE_KEY|service_role|SERVICE_ROLE_KEY/;
const webViteSecretPattern = /VITE_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|API_KEY)[A-Z0-9_]*/;

for (const path of files) {
  if (skipPath(path) || path === 'scripts/security-audit.mjs') continue;
  const ext = extname(path);
  if (!sourceExtensions.has(ext) && !path.endsWith('.env.example') && !path.endsWith('.gitignore')) continue;
  let text;
  try {
    text = readFileSync(resolve(root, path), 'utf8');
  } catch {
    continue;
  }
  if (text.length > 2_000_000) {
    warn(`${path} is large and was skipped for secret-pattern scanning.`);
    continue;
  }
  for (const pattern of secretPatterns) {
    if (pattern.re.test(text)) fail(`${pattern.name} pattern found in ${path}`);
  }
  if (path.startsWith('apps/web/src/')) {
    if (webServiceRolePattern.test(text)) fail(`server-side Supabase service-role reference found in browser source: ${path}`);
    const viteMatch = text.match(webViteSecretPattern);
    if (viteMatch) fail(`browser-exposed Vite secret variable found: ${viteMatch[0]} in ${path}`);
  }
}

const main = read('apps/api/src/main.js');
if (!main.includes("app.set('trust proxy', TRUST_PROXY)")) fail('API must set an explicit trusted-proxy hop, not trust every proxy');
if (/app\.set\(['"]trust proxy['"],\s*true\)/.test(main)) fail('API must not trust every proxy');
if (!main.includes('app.disable(\'x-powered-by\')')) fail('API must disable the X-Powered-By banner');
if (!main.includes("app.set('json escape', true)")) fail('API must enable JSON escaping');
if (!main.includes('helmet(')) fail('API must use Helmet');
if (!main.includes('globalRateLimit')) fail('API must use the global rate limiter');
if (!main.includes('express.json(')) fail('API must configure JSON body parsing');
if (!main.includes('limit: BodyLimit')) fail('API JSON body limit must be explicit');
if (!main.includes("Origin'") && !main.includes('configuredOrigins')) fail('API CORS origins must be explicitly configured');
if (/origin:\s*['"]\*['"]/.test(main)) fail('CORS must not use a wildcard origin with credentials');

const routesIndex = read('apps/api/src/routes/index.js');
if (!routesIndex.includes('authSendEmailRateLimit')) fail('authentication email endpoint must be rate-limited');
if (!routesIndex.includes("router.use('/security-programme'")) fail('security programme route must be mounted');
if (!routesIndex.includes("router.use('/workforce'")) fail('workforce route must be mounted');

const securityRoutes = read('apps/api/src/routes/security-programme.js');
if (!securityRoutes.includes('supabaseAuth') || !securityRoutes.includes('assertAdmin')) {
  fail('security programme routes must require authentication and admin authorisation');
}
if (!securityRoutes.includes('Cache-Control')) fail('security programme routes must disable caching');

const programmeService = read('apps/api/src/services/security-programme.js');
if (!programmeService.includes('mode: 0o600') || !programmeService.includes('chmod(STORE_PATH, 0o600)')) {
  fail('security register must persist with restricted 0600 permissions');
}
if (!programmeService.includes('evidence.length < 8')) fail('security controls must require evidence for implemented/verified status');
if (!programmeService.includes('closing an incident') && !programmeService.includes('Closing an incident')) {
  fail('incident closure must require resolution evidence and lessons');
}

const workforceService = read('apps/api/src/services/workforce.js');
if (!workforceService.includes('mode: 0o600') || !workforceService.includes('chmod(STORE_PATH, 0o600)')) {
  fail('workforce register must persist with restricted 0600 permissions');
}

const vault = read('apps/api/src/utils/vault.js');
if (!vault.includes('aes-256-gcm')) fail('broker credential vault must use AES-256-GCM');
if (!vault.includes('VAULT_ENCRYPTION_KEY')) fail('broker credential vault must use a server-side key');

const webClient = read('apps/web/src/lib/pocketbaseClient.js');
if (webClient.includes('SERVICE_ROLE') || webClient.includes('service_role')) {
  fail('browser Supabase client must not reference a service-role key');
}

for (const required of [
  'scripts/security-audit.mjs',
  'supabase/security/rls-audit.sql',
  'docs/security/00-README.md',
  'docs/security/01-SECURITY-PROGRAMME.md',
  'docs/security/03-INCIDENT-RESPONSE-PLAN.md',
  'docs/security/12-PRODUCTION-HARDENING-RUNBOOK.md',
  'deploy/security/nginx-tradingbible-tunnel.conf',
  'deploy/security/ufw-tradingbible.sh',
]) {
  if (!existsSync(resolve(root, required))) fail(`required security artefact missing: ${required}`);
}

if (!existsSync(resolve(root, 'apps/api/.env.example'))) {
  fail('apps/api/.env.example is missing');
} else {
  const envExample = read('apps/api/.env.example');
  if (!envExample.includes('TRUST_PROXY=')) warn('apps/api/.env.example should document TRUST_PROXY');
  if (!envExample.includes('VAULT_ENCRYPTION_KEY=')) warn('apps/api/.env.example should document VAULT_ENCRYPTION_KEY');
  if (!envExample.includes('HELMET_HSTS=')) warn('apps/api/.env.example should document the HELMET_HSTS owner switch');
}

if (failures.length) {
  console.error(`Security audit FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length) {
    console.error(`Warnings (${warnings.length}):`);
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log(`Security audit passed (${files.length} tracked files checked).`);
if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const warning of warnings) console.log(`- ${warning}`);
}
