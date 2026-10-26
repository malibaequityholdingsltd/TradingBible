import React, { useMemo, useState } from 'react';
import {
  Building2, X, Search, Pencil, RefreshCw, Copy, Check, ExternalLink,
  Fingerprint, Landmark, Palette, Mail, Users, BarChart3, Cpu, Wallet, ShieldCheck, Rocket,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isAdminUser } from '@/lib/entitlements';
import { useCompanyProfile, COMPANY_SECTIONS, buildContextText } from '@/lib/companyProfile';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';

const SECTION_ICONS = {
  identity: Fingerprint, legal: Landmark, holdings: Building2, brand: Palette,
  contacts: Mail, leadership: Users, markets: BarChart3, product: Cpu,
  monetization: Wallet, compliance: ShieldCheck, roadmap: Rocket,
};

const pretty = (k) => String(k || '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const hexesOf = (v) => String(v || '').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
const filledOf = (o) => Object.values(o || {}).filter((v) => String(v ?? '').trim() !== '').length;

function openHref(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (s.includes('@')) return `mailto:${s.split(/\s|,/)[0]}`;
  const m = s.match(/https?:\/\/[^\s,)]+/i) || s.match(/[\w-]+\.[\w.-]+(\/\S*)?/);
  if (!m) return null;
  return /^https?:\/\//i.test(m[0]) ? m[0] : `https://${m[0]}`;
}

// Admin-only floating widget, patterned on LiveChatWidget: one mount,
// survives navigation, bottom-RIGHT stacked above the SI bubble.
// Redesigned to mirror /admin/company: hero status, TB/TBC strip,
// icon section rail, rich field cards, SI-brief copy.
export default function AdminCompanyWidget() {
  const { user } = useAuth();
  if (!isAdminUser(user)) return null;
  return <Inner />;
}

function Inner() {
  const { profile, stored, loading, source, reload } = useCompanyProfile();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [section, setSection] = useState('holdings');
  const [copied, setCopied] = useState(false);

  const totals = useMemo(() => {
    let fields = 0, filled = 0;
    for (const s of COMPANY_SECTIONS) {
      fields += Object.keys(profile[s.id] || {}).length;
      filled += filledOf(profile[s.id]);
    }
    return { fields, filled, pct: fields ? Math.round((filled / fields) * 100) : 0 };
  }, [profile]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return null;
    const hits = [];
    for (const s of COMPANY_SECTIONS) {
      for (const [k, v] of Object.entries(profile[s.id] || {})) {
        if (`${s.label} ${k} ${v}`.toLowerCase().includes(needle)) hits.push({ sec: s.id, section: s.label, key: k, value: String(v) });
      }
    }
    return hits.slice(0, 60);
  }, [q, profile]);

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(buildContextText(profile));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked */ }
  };

  const holdings = profile.holdings || {};
  const Icon = SECTION_ICONS[section] || Building2;

  return (
    <div className="admin-company-widget">
      {open && (
        <div className="cb-scope fixed bottom-3 right-3 z-[70] flex h-[36rem] max-h-[calc(100dvh-2rem)] w-[min(29rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[1.6rem] border border-[#d4af37]/25 bg-[#0c0c11]/92 shadow-[0_24px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(212,175,55,0.14)] backdrop-blur-xl">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(212,175,55,0.10),transparent)]" />

          {/* Hero header */}
          <div className="relative border-b border-[#d4af37]/12 bg-[#0a0a0f]/70 px-4 pb-3 pt-3.5">
            <div className="flex items-center gap-2.5">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10">
                <img src={TRADINGBIBLE_LOGO} alt="" className="h-7 w-7 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="absolute -bottom-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#d4af37] px-1 font-mono text-[8px] font-black text-[#0a0a0f]">A–Z</span>
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="gold-text truncate text-[15px] font-extrabold">Company Bible</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#8a8577]">
                  <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-[#d4af37]' : stored ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  {loading ? 'loading…' : stored ? `stored · via ${source} · ${totals.pct}% filled` : 'defaults · not yet stored'}
                </div>
              </div>
              <button onClick={reload} title="Reload from server" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:text-[#f0ecdd]"><RefreshCw className="h-3.5 w-3.5" /></button>
              <button onClick={copyBrief} title="Copy SI brief" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:text-[#f0ecdd]">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button>
              <Link to="/admin/company" title="Open full page" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] transition hover:bg-[#d4af37]/20"><Pencil className="h-3.5 w-3.5" /></Link>
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:text-[#f0ecdd]"><X className="h-4 w-4" /></button>
            </div>
            {/* TB / TBC strip */}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/[0.06] px-2.5 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#d4af37]">Stock</span>
                <span className="ml-1.5 font-mono text-sm font-black text-[#f0ecdd]">{holdings.ticker || 'TB'}</span>
              </div>
              <div className="rounded-lg border border-violet-400/25 bg-violet-400/[0.05] px-2.5 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-violet-300">Coin</span>
                <span className="ml-1.5 font-mono text-sm font-black text-[#f0ecdd]">{holdings.coin || 'TBC'}</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/20 bg-[#0f0f14]/90 px-3 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search A–Z…" className="w-full bg-transparent py-0.5 text-[13px] text-[#e9e7df] placeholder-[#6a665a] outline-none" />
                {q && <button onClick={() => setQ('')} className="shrink-0 text-[10px] font-bold text-[#8a8577] hover:text-[#e9e7df]">Clear</button>}
              </div>
            </div>
          </div>

          {results ? (
            <div className="flex-1 space-y-2 overflow-y-auto p-3.5">
              {results.length === 0 && <p className="py-3 text-center text-xs text-[#8a8577]">No matches. Clear search to browse.</p>}
              {results.map((h, i) => (
                <button key={i} onClick={() => { setSection(h.sec); setQ(''); }}
                  className="block w-full rounded-xl border border-white/[0.06] bg-black/25 p-3 text-left transition hover:border-[#d4af37]/35">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#d4af37]">{h.section} · {pretty(h.key)}</div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#c9c4b4]">{h.value}</p>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 pt-2.5">
                {COMPANY_SECTIONS.map((s) => {
                  const SIcon = SECTION_ICONS[s.id] || Building2;
                  const active = section === s.id;
                  const n = filledOf(profile[s.id]);
                  const total = Object.keys(profile[s.id] || {}).length;
                  return (
                    <button key={s.id} onClick={() => setSection(s.id)} title={`${s.label} · ${n}/${total}`}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition ${active ? 'border-[#d4af37]/60 bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'border-white/[0.07] text-[#8a8577] hover:text-[#e9e7df]'}`}>
                      <SIcon className="h-3 w-3" />{s.label}
                      <span className={`font-mono text-[9px] ${active ? 'text-[#0a0a0f]/70' : 'text-[#6a665a]'}`}>{n}/{total}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
                <Icon className="h-3.5 w-3.5 text-[#d4af37]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#f0ecdd]">
                  {COMPANY_SECTIONS.find((s) => s.id === section)?.label}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-3.5 pb-3.5">
                {Object.entries(profile[section] || {}).map(([k, v]) => {
                  const href = openHref(v);
                  const sw = hexesOf(v);
                  return (
                    <div key={k} className="rounded-xl border border-[#d4af37]/12 bg-[#0a0a0f]/60 p-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d4af37]">{pretty(k)}</div>
                        {href && <a href={href} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-[#8a8577] hover:text-[#d4af37]">open <ExternalLink className="h-2.5 w-2.5" /></a>}
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#c9c4b4]">{String(v)}</p>
                      {sw.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {sw.map((hex, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 py-px pl-px pr-1.5">
                              <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: hex }} />
                              <span className="font-mono text-[9px] text-[#c9c4b4]">{hex}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <Link to="/admin/company" className="flex items-center justify-center gap-1.5 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/[0.06] p-3 text-xs font-bold text-[#d4af37] transition hover:bg-[#d4af37]/12">
                  <Pencil className="h-3.5 w-3.5" /> Edit everything → /admin/company
                </Link>
              </div>
            </>
          )}
        </div>
      )}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open Company Bible" title="Company Bible — full brand A–Z"
          className="cb-scope group fixed bottom-[145px] right-3 z-[70] hidden h-14 w-14 place-items-center rounded-full border border-[#d4af37]/40 bg-gradient-to-br from-[#141309] to-[#0c0c11] shadow-[0_8px_28px_rgba(0,0,0,0.5),0_0_24px_rgba(212,175,55,0.25)] transition-transform hover:scale-105 sm:grid">
          <Building2 className="h-6 w-6 text-[#d4af37] transition group-hover:text-[#f4e6a8]" />
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-1 font-mono text-[9px] font-black text-[#0a0a0f]">A–Z</span>
          {stored && <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0f] bg-emerald-400" />}
        </button>
      )}
    </div>
  );
}
