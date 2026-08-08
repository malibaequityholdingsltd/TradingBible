import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, KeyRound, Webhook, ChevronDown } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

function Code({ children }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(children).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };
  return (
    <div className="relative">
      <button onClick={copy} className="absolute right-2 top-2 rounded-md border border-white/10 bg-[#0a0a0f] p-1.5 text-[#8a8577] transition hover:text-[#d4af37]">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button>
      <pre className="no-scrollbar overflow-x-auto rounded-xl border border-white/8 bg-[#0a0a0f] p-3 pr-10 font-mono text-[11.5px] leading-relaxed text-[#c9c4b4] sm:p-4 sm:text-[12.5px]"><code>{children}</code></pre>
    </div>
  );
}

function Section({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass rounded-2xl">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 p-4 text-left sm:p-6">
        <Icon className="h-4 w-4 shrink-0 text-[#d4af37]" />
        <h3 className="flex-1 font-semibold text-[#f0ecdd]">{title}</h3>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#8a8577] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>}
    </div>
  );
}

const ENDPOINTS = [
  { m: 'GET', p: '/v1/trades', d: 'List synced trades with pagination & filters' },
  { m: 'GET', p: '/v1/trades/:id', d: 'Retrieve a single trade' },
  { m: 'POST', p: '/v1/trades', d: 'Push an external trade into the journal' },
  { m: 'GET', p: '/v1/analytics/summary', d: 'Win rate, profit factor, drawdown, equity' },
  { m: 'GET', p: '/v1/brokers', d: 'List connected broker accounts & sync status' },
  { m: 'POST', p: '/v1/webhooks', d: 'Register a webhook for trade & report events' },
];

const MCOLOR = { GET: '#34d399', POST: '#d4af37', DELETE: '#e06666' };

export default function ApiDocsPage() {
  return (
    <AppLayout title="API Documentation">
      <div className="mb-5 glass rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Code2 className="h-5 w-5" /></div><div className="min-w-0"><h3 className="font-semibold text-[#f0ecdd]">TradingBible REST API v1</h3><p className="truncate text-xs text-[#8a8577]">Base URL: <span className="font-mono text-[#d4af37]">https://api.tradingbible.app</span></p></div></div>
        <p className="mt-4 text-sm text-[#c9c4b4]">Integrate your trade data, analytics and broker connections into third-party tools, dashboards and bots. All requests are authenticated with a bearer API key and return JSON.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section icon={KeyRound} title="Authentication">
            <p className="mb-3 text-sm text-[#8a8577]">Generate an API key in Settings → API. Pass it in the <span className="font-mono text-[#d4af37]">Authorization</span> header on every request.</p>
            <Code>{`curl https://api.tradingbible.app/v1/trades \\
  -H "Authorization: Bearer tb_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json"`}</Code>
          </Section>

          <Section icon={Terminal} title="Fetch analytics (JavaScript)">
            <Code>{`const res = await fetch(
  "https://api.tradingbible.app/v1/analytics/summary",
  { headers: { Authorization: "Bearer " + process.env.TB_API_KEY } }
);
const data = await res.json();
console.log(data.winRate, data.profitFactor, data.maxDrawdown);`}</Code>
          </Section>

          <Section icon={Terminal} title="Push a trade (Python)" defaultOpen={false}>
            <Code>{`import requests

requests.post(
    "https://api.tradingbible.app/v1/trades",
    headers={"Authorization": f"Bearer {TB_API_KEY}"},
    json={
        "symbol": "EURUSD",
        "direction": "long",
        "entry": 1.0842,
        "exit": 1.0921,
        "size": 2.0,
        "strategy": "Breakout",
    },
)`}</Code>
          </Section>

          <Section icon={Webhook} title="Webhooks" defaultOpen={false}>
            <p className="mb-3 text-sm text-[#8a8577]">Subscribe to events like <span className="font-mono text-[#d4af37]">trade.created</span>, <span className="font-mono text-[#d4af37]">report.weekly</span> and <span className="font-mono text-[#d4af37]">broker.synced</span>. We POST a signed JSON payload to your URL.</p>
            <Code>{`{
  "event": "trade.created",
  "sentAt": "2025-08-08T09:12:44Z",
  "data": { "id": "tr_9f2", "symbol": "BTCUSD", "pnl": 700 }
}`}</Code>
          </Section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Section icon={Code2} title="Endpoints">
            <div className="space-y-2">
              {ENDPOINTS.map((e) => (
                <div key={e.p} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2"><span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold" style={{ background: `${MCOLOR[e.m]}1a`, color: MCOLOR[e.m] }}>{e.m}</span><span className="font-mono text-xs text-[#e9e7df]">{e.p}</span></div>
                  <p className="mt-1 text-xs text-[#8a8577]">{e.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-[#d4af37]/15 bg-[#d4af37]/[0.05] p-3 text-xs text-[#c9c4b4]">Rate limit: 600 req/min per key. Responses are paginated at 100 records.</div>
          </Section>
        </div>
      </div>
    </AppLayout>
  );
}
