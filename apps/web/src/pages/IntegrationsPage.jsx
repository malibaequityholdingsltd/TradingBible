import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Search, CheckCircle2, AlertCircle, CircleDashed, Copy, Check,
  Activity, LineChart, Plug, Mail, MessageSquare, CreditCard, Bot, Workflow,
} from 'lucide-react';

// Status legend ------------------------------------------------------------
const STATUS = {
  implemented: { label: 'Implemented', icon: CheckCircle2, cls: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  needed: { label: 'Needed', icon: AlertCircle, cls: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  optional: { label: 'Optional', icon: CircleDashed, cls: 'text-[#8a8577] border-[#8a8577]/30 bg-[#8a8577]/10' },
};

// The full integration catalogue -----------------------------------------
const CATEGORIES = [
  {
    id: 'market-data', label: 'Market Data', icon: Activity,
    items: [
      { name: 'Binance API', provider: 'Binance', status: 'implemented',
        purpose: 'Live crypto spot prices and OHLC klines for charts, tickers and heatmaps.',
        usedIn: 'Global ticker, /app/charts, /app/heatmaps, useCandles hook (via Express /candles).',
        env: 'BINANCE_API_KEY, BINANCE_API_SECRET', envLoc: 'apps/api/.env',
        setup: 'Create an API key at binance.com → API Management. Read-only permissions are enough. Public market endpoints work without a key; add keys only to raise rate limits.' },
      { name: 'Polygon.io', provider: 'Polygon.io', status: 'needed',
        purpose: 'Real-time and historical stocks, forex and options aggregates.',
        usedIn: 'Stock/forex candles fallback for /app/charts and /app/signals.',
        env: 'POLYGON_API_KEY', envLoc: 'apps/api/.env',
        setup: 'Sign up at polygon.io, copy your key from the dashboard, add it to apps/api/.env, then reload the app.' },
      { name: 'Finnhub', provider: 'Finnhub', status: 'optional',
        purpose: 'Stock fundamentals, company news and quote data.',
        usedIn: 'Equity quotes and news widgets (planned).',
        env: 'FINNHUB_API_KEY', envLoc: 'apps/api/.env',
        setup: 'Register at finnhub.io, generate a free token, store it in apps/api/.env.' },
      { name: 'Alpha Vantage', provider: 'Alpha Vantage', status: 'optional',
        purpose: 'Forex and crypto time-series when other feeds are unavailable.',
        usedIn: 'Backup candle source for forex/crypto.',
        env: 'ALPHAVANTAGE_API_KEY', envLoc: 'apps/api/.env',
        setup: 'Get a free key at alphavantage.co/support/#api-key and add it to apps/api/.env. Note the 5 req/min free limit.' },
      { name: 'IEX Cloud', provider: 'IEX Cloud', status: 'optional',
        purpose: 'US equities quotes and reference data.',
        usedIn: 'Stock price fallback.',
        env: 'IEXCLOUD_API_TOKEN', envLoc: 'apps/api/.env',
        setup: 'Create a token in the IEX Cloud console, add it to apps/api/.env.' },
    ],
  },
  {
    id: 'charting', label: 'Charting', icon: LineChart,
    items: [
      { name: 'TradingView Lightweight Charts', provider: 'TradingView', status: 'implemented',
        purpose: 'High-performance canvas candlestick/area/line charts with indicators, crosshair and volume.',
        usedIn: '/app/charts (LiveChart component) — powered by the lightweight-charts npm package.',
        env: 'None (client-side library)', envLoc: 'apps/web/package.json',
        setup: 'Installed via npm (lightweight-charts). No API key required; it renders data supplied by our market-data feeds.' },
    ],
  },
  {
    id: 'brokers', label: 'Brokers & Prop Firms', icon: Plug,
    items: [
      { name: 'MetaTrader 4 / 5 API', provider: 'MetaQuotes', status: 'needed',
        purpose: 'Sync trade history and balances from MT4/MT5 accounts.',
        usedIn: '/app/brokers connection flow, trade auto-import.',
        env: 'MT_BRIDGE_URL, MT_BRIDGE_TOKEN', envLoc: 'apps/api/.env',
        setup: 'Requires an MT4/MT5 bridge/EA or a provider like MetaApi. Store the bridge URL and token in apps/api/.env.' },
      { name: 'cTrader Open API', provider: 'Spotware', status: 'needed',
        purpose: 'OAuth account access, positions and deals.',
        usedIn: '/app/brokers (cTrader OAuth).',
        env: 'CTRADER_CLIENT_ID, CTRADER_CLIENT_SECRET', envLoc: 'apps/api/.env',
        setup: 'Register an app at openapi.ctrader.com, add client id/secret to apps/api/.env, configure the OAuth redirect.' },
      { name: 'DXtrade API', provider: 'Devexperts', status: 'needed',
        purpose: 'Account balances and trade sync for DXtrade brokers.',
        usedIn: '/app/brokers (DXtrade login).',
        env: 'DXTRADE_API_URL, DXTRADE_API_KEY', envLoc: 'apps/api/.env',
        setup: 'Obtain DXtrade API credentials from your broker and store them in apps/api/.env.' },
      { name: 'Interactive Brokers API', provider: 'Interactive Brokers', status: 'needed',
        purpose: 'Stocks/futures portfolio and executions.',
        usedIn: '/app/brokers (IBKR OAuth / Client Portal).',
        env: 'IBKR_CLIENT_ID, IBKR_CLIENT_SECRET', envLoc: 'apps/api/.env',
        setup: 'Enable the Client Portal / Web API in IBKR, register OAuth, store credentials in apps/api/.env.' },
      { name: 'Bybit API', provider: 'Bybit', status: 'needed',
        purpose: 'Crypto derivatives balances and fills.',
        usedIn: '/app/brokers (Bybit API key).',
        env: 'BYBIT_API_KEY, BYBIT_API_SECRET', envLoc: 'apps/api/.env',
        setup: 'Create a read-only API key in Bybit → API Management, add to apps/api/.env.' },
      { name: 'Coinbase API', provider: 'Coinbase', status: 'needed',
        purpose: 'Crypto account balances and transactions.',
        usedIn: '/app/brokers (Coinbase OAuth).',
        env: 'COINBASE_CLIENT_ID, COINBASE_CLIENT_SECRET', envLoc: 'apps/api/.env',
        setup: 'Register an OAuth app in the Coinbase developer portal and store credentials in apps/api/.env.' },
    ],
  },
  {
    id: 'email', label: 'Email', icon: Mail,
    items: [
      { name: 'Supabase Auth Mailer', provider: 'Supabase', status: 'implemented',
        purpose: 'Transactional email: login OTP, signup verification, security alerts.',
        usedIn: 'Supabase Auth email templates and SMTP configuration.',
        env: 'SUPABASE_URL, SUPABASE_ANON_KEY (+ SMTP in Supabase Auth settings)', envLoc: 'apps/api/.env and Supabase dashboard',
        setup: 'Configure branded SMTP in Supabase Auth settings and customize OTP templates for deliverability.' },
      { name: 'SendGrid / Mailgun', provider: 'Twilio SendGrid / Mailgun', status: 'optional',
        purpose: 'High-volume marketing email or a dedicated sending domain.',
        usedIn: 'Optional alternative to the built-in mailer.',
        env: 'SENDGRID_API_KEY or MAILGUN_API_KEY', envLoc: 'apps/api/.env',
        setup: 'Only needed if you outgrow the built-in relay. Add the provider key to apps/api/.env.' },
    ],
  },
  {
    id: 'sms', label: 'SMS', icon: MessageSquare,
    items: [
      { name: 'Twilio', provider: 'Twilio', status: 'needed',
        purpose: 'SMS price alerts and phone OTP delivery.',
        usedIn: '/app/alerts (SMS channel), phone OTP login.',
        env: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER', envLoc: 'apps/api/.env',
        setup: 'Create a Twilio account, buy a messaging number, add the SID, auth token and from-number to apps/api/.env.' },
    ],
  },
  {
    id: 'payment', label: 'Payment', icon: CreditCard,
    items: [
      { name: 'Paddle API', provider: 'Paddle', status: 'implemented',
        purpose: 'Subscription billing, checkout, invoices and webhooks (merchant of record).',
        usedIn: '/app/billing, Express /paddle routes, subscription fields on users.',
        env: 'PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET, VITE_PADDLE_CLIENT_TOKEN', envLoc: 'apps/api/.env + apps/web/.env',
        setup: 'From the Paddle dashboard copy the API key and webhook secret to apps/api/.env, and the client-side token to apps/web/.env.' },
      { name: 'Circle x402 Gateway', provider: 'Circle', status: 'optional',
        purpose: 'Usage-based micropayment gate for API routes (for example, AI stream endpoints).',
        usedIn: 'Express middleware on /integrated-ai (toggle via env flags).',
        env: 'CIRCLE_X402_ENABLED, CIRCLE_X402_SELLER_ADDRESS, CIRCLE_X402_PRICE', envLoc: 'apps/api/.env',
        setup: 'Install @circle-fin/x402-batching, set your seller wallet address, then enable CIRCLE_X402_ENABLED=true to enforce per-request pricing.' },
    ],
  },
  {
    id: 'ai', label: 'Artificial Intelligence', icon: Bot,
    items: [
      { name: 'Integrated AI', provider: 'Platform (preconfigured)', status: 'implemented',
        purpose: 'Powers the AI Trading Coach: trade reviews, scoring and chat.',
        usedIn: '/app/coach via apps/web/src/lib/integratedAiClient.js and Express /integrated-ai.',
        env: 'Managed by the platform', envLoc: 'apps/api (integrated-ai)',
        setup: 'No key required — credentials are provisioned by the platform. Use the integrated AI client directly.' },
      { name: 'OpenAI API', provider: 'OpenAI', status: 'optional',
        purpose: 'Alternative direct model access if you prefer your own OpenAI account.',
        usedIn: 'Optional replacement for Integrated AI.',
        env: 'OPENAI_API_KEY', envLoc: 'apps/api/.env',
        setup: 'Create a key at platform.openai.com and add it to apps/api/.env. Not required while Integrated AI is enabled.' },
    ],
  },
  {
    id: 'automation', label: 'Automation', icon: Workflow,
    items: [
      { name: 'n8n Webhooks', provider: 'n8n', status: 'optional',
        purpose: 'Scheduled tasks and workflow automation (daily reports, weekly reviews, signup events).',
        usedIn: 'PocketBase hooks fire webhooks to n8n on record events.',
        env: 'N8N_WEBHOOK_URL', envLoc: 'apps/pocketbase/pb_hooks',
        setup: 'Host an n8n instance, create a webhook workflow, and set its URL in the hook environment.' },
    ],
  },
];

function CopyChip({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 font-mono text-[11px] text-[#c9c4b4] transition hover:border-[#d4af37]/40"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-[#8a8577]" />}
      {text}
    </button>
  );
}

function StatusBadge({ status }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

export default function IntegrationsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const q = query.trim().toLowerCase();
  const categories = CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((it) => {
      if (filter !== 'all' && it.status !== filter) return false;
      if (!q) return true;
      return [it.name, it.provider, it.purpose, it.usedIn, it.env].join(' ').toLowerCase().includes(q);
    }),
  })).filter((cat) => cat.items.length);

  const counts = CATEGORIES.flatMap((c) => c.items).reduce((acc, it) => {
    acc[it.status] = (acc[it.status] || 0) + 1; acc.total += 1; return acc;
  }, { total: 0, implemented: 0, needed: 0, optional: 0 });

  return (
    <AppLayout title="API Keys & Integrations">
      <div className="mx-auto max-w-[96rem]">
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-[#b3ae9e]">
          Every external service TradingBible connects to, what it powers, where it lives in the codebase, and how to
          configure it. Server-side keys go in <span className="font-mono text-[#d4af37]">apps/api/.env</span> (never in the browser); client tokens go in <span className="font-mono text-[#d4af37]">apps/web/.env</span>.
        </p>
        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">Implemented = already wired</span>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-300">Needed = add key to activate</span>
          <span className="rounded-full border border-[#8a8577]/30 bg-[#8a8577]/10 px-2.5 py-1 text-[#c9c4b4]">Optional = only if you need that feature</span>
        </div>

        {/* Summary + legend */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: 'total', label: 'Total integrations', val: counts.total, cls: 'text-[#e9e7df]' },
            { k: 'implemented', label: 'Implemented', val: counts.implemented, cls: 'text-emerald-400' },
            { k: 'needed', label: 'Keys needed', val: counts.needed, cls: 'text-amber-400' },
            { k: 'optional', label: 'Optional', val: counts.optional, cls: 'text-[#8a8577]' },
          ].map((s) => (
            <div key={s.k} className="glass rounded-xl p-4">
              <div className={`text-2xl font-bold ${s.cls}`}>{s.val}</div>
              <div className="text-[11px] uppercase tracking-wide text-[#8a8577]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8577]" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search APIs, providers, env vars…"
              className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] py-2.5 pl-10 pr-3 text-sm text-[#e9e7df] placeholder:text-[#5f5b50] focus:border-[#d4af37]/40 focus:outline-none"
            />
          </div>
          <div className="flex overflow-x-auto rounded-xl border border-[#d4af37]/15">
            {['all', 'implemented', 'needed', 'optional'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-3 py-2.5 text-xs capitalize transition ${filter === f ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-10">
          {categories.map((cat) => (
            <section key={cat.id}>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#d4af37]/10 text-[#d4af37]">
                  <cat.icon className="h-4.5 w-4.5" />
                </div>
                <h2 className="text-lg font-semibold text-[#f0ecdd]">{cat.label}</h2>
                <span className="text-xs text-[#5f5b50]">({cat.items.length})</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {cat.items.map((it) => (
                  <div key={it.name} className="glass glass-hover rounded-2xl p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#f0ecdd]">{it.name}</h3>
                        <p className="text-xs text-[#8a8577]">{it.provider}</p>
                      </div>
                      <StatusBadge status={it.status} />
                    </div>
                    <p className="mb-3 text-sm leading-relaxed text-[#b3ae9e]">{it.purpose}</p>
                    <dl className="space-y-2 text-xs">
                      <div>
                        <dt className="mb-0.5 font-semibold uppercase tracking-wide text-[#5f5b50]">Where it's used</dt>
                        <dd className="text-[#c9c4b4]">{it.usedIn}</dd>
                      </div>
                      <div>
                        <dt className="mb-1 font-semibold uppercase tracking-wide text-[#5f5b50]">Environment variables</dt>
                        <dd className="flex flex-wrap gap-1.5">
                          {it.env.split(',').map((e) => e.trim()).map((e) => <CopyChip key={e} text={e} />)}
                          <span className="self-center text-[10px] text-[#5f5b50]">in {it.envLoc}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="mb-0.5 font-semibold uppercase tracking-wide text-[#5f5b50]">Setup</dt>
                        <dd className="leading-relaxed text-[#b3ae9e]">{it.setup}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!categories.length && (
            <div className="grid h-40 place-items-center text-sm text-[#8a8577]">No integrations match your search.</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
