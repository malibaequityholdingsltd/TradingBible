import React, { useEffect, useMemo, useState } from 'react';
import { Save, RotateCcw, Building2, Eye, Type, Palette, Sparkles, Check } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, GhostButton, GoldButton, Note, SectionHead } from '@/components/ui-kit';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import {
  WL_DEFAULTS, WL_PRESETS, applyWhiteLabel,
  loadLocalTheme, saveLocalTheme, clearLocalTheme,
  loadAccountTheme, saveAccountTheme,
} from '@/lib/whitelabel';

const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 min-h-[44px]';

function ColorField({ label, value, onChange }) {
  const v = /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#000000';
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#8a8577]">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={v} onChange={(e) => onChange(e.target.value)} aria-label={label}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1" />
        <input className={`${input} font-mono`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" spellCheck={false} />
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#8a8577]">{label}</label>
      <input className={input} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function BrandingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(() => loadLocalTheme() || WL_DEFAULTS);
  const [recordId, setRecordId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    loadAccountTheme(user.id).then((rec) => {
      if (!rec) return;
      const { recordId: rid, ...theme } = rec;
      setRecordId(rid);
      const merged = { ...WL_DEFAULTS, ...theme };
      setForm(merged);
      applyWhiteLabel(merged);
      saveLocalTheme(merged);
    }).catch(() => {});
  }, [user?.id]);

  const set = (k) => (v) => {
    const next = { ...form, [k]: typeof v === 'string' ? v : v?.target?.value ?? v };
    setForm(next);
    setActivePreset(null);
    applyWhiteLabel(next);
    saveLocalTheme(next);
  };

  const pickPreset = (p) => {
    const next = { ...form, accentColor: p.accentColor, headingColor: p.headingColor, bodyColor: p.bodyColor, mutedColor: p.mutedColor, primaryColor: p.primaryColor };
    setForm(next);
    setActivePreset(p.id);
    applyWhiteLabel(next);
    saveLocalTheme(next);
  };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!user?.id) return;
    setBusy(true);
    try {
      const rid = await saveAccountTheme(user.id, recordId, form);
      setRecordId(rid);
      applyWhiteLabel(form);
      saveLocalTheme(form);
      toast({ title: t('brd.saved'), description: t('brd.savedSub') });
    } catch {
      toast({ variant: 'destructive', title: t('brd.saveFail'), description: t('brd.tryAgain') });
    } finally { setBusy(false); }
  };

  const reset = () => {
    setForm(WL_DEFAULTS);
    setActivePreset('tb-gold');
    applyWhiteLabel(WL_DEFAULTS);
    clearLocalTheme();
  };

  const preview = useMemo(() => form, [form]);
  const logo = preview.logoUrl || TRADINGBIBLE_LOGO;

  return (
    <AppLayout title={t('brd.pageTitle')}>
      <div className="tb-page !max-w-[1400px]">
        {/* ── Studio hero ── */}
        <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/25 bg-[#0c0c11]/95">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(212,175,55,0.14),transparent_60%)]" />
          <div className="relative flex flex-wrap items-center gap-4 p-6 sm:p-7">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/15 text-[#d4af37]"><Building2 className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1 basis-64">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">White-label · Rebrand studio</p>
              <h1 className="mt-1 text-2xl font-extrabold text-[#f0ecdd] sm:text-3xl">Your brand, everywhere.</h1>
              <p className="mt-1 max-w-xl text-[13px] text-[#8a8577]">Name, logo, brand colors and text colors apply live across the app the moment you pick them. Save to keep them on your account.</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live applied
            </span>
          </div>
        </div>

        {/* ── Presets ── */}
        <div className="mt-4 rounded-3xl border border-white/8 bg-black/20 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]"><Sparkles className="h-4 w-4 text-[#d4af37]" /> One-click themes</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {WL_PRESETS.map((p) => (
              <button key={p.id} onClick={() => pickPreset(p)}
                className={`group flex min-h-[56px] items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5 ${activePreset === p.id ? 'border-[#d4af37]/60 bg-[#d4af37]/[0.07]' : 'border-white/8 bg-black/30 hover:border-white/20'}`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl font-mono text-xs font-extrabold" style={{ background: p.accentColor, color: p.primaryColor }}>Aa</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-[#f0ecdd]">{p.label}</span>
                  <span className="block font-mono text-[10px] text-[#6a665a]">{p.accentColor}</span>
                </span>
                {activePreset === p.id && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-[#d4af37]" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_26rem]">
          {/* ── Controls ── */}
          <div className="min-w-0 space-y-4">
            <Card className="p-5 sm:p-6">
              <SectionHead icon={Building2} title="Brand identity" sub="Name, slogan and logo" />
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label={t('brd.company')} value={form.companyName} onChange={set('companyName')} placeholder={t('brd.companyPh')} />
                  <TextField label={t('brd.tagline')} value={form.tagline} onChange={set('tagline')} placeholder={t('brd.sloganPh')} />
                </div>
                <TextField label={t('brd.logoUrl')} value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://…" />
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                  <img src={logo} alt="logo" className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <div className="min-w-0 text-xs text-[#8a8577]">Logo shows in the preview nav and across your seats once saved. Square art works best.</div>
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <SectionHead icon={Palette} title="Brand colors" sub="Buttons, highlights and surfaces" />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColorField label="Accent (buttons, highlights)" value={form.accentColor} onChange={set('accentColor')} />
                <ColorField label="Surface (preview backdrop)" value={form.primaryColor} onChange={set('primaryColor')} />
              </div>
            </Card>

            <Card className="border-[#d4af37]/25 p-5 sm:p-6">
              <SectionHead icon={Type} title="Text colors" sub="New — headings, body and muted text" />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ColorField label="Headings" value={form.headingColor} onChange={set('headingColor')} />
                <ColorField label="Body text" value={form.bodyColor} onChange={set('bodyColor')} />
                <ColorField label="Muted text" value={form.mutedColor} onChange={set('mutedColor')} />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#6a665a]">Text colors apply live to every token-driven surface app-wide (cards, heroes, buttons) and to the preview. Hard-coded legacy hexes keep their color until migrated.</p>
            </Card>

            <div className="flex flex-wrap gap-2">
              <GoldButton disabled={busy} onClick={save} className="!px-6 !py-3 !text-sm">
                {busy ? 'Saving…' : <><Save className="h-4 w-4" /> {t('brd.save')}</>}
              </GoldButton>
              <GhostButton type="button" onClick={reset} className="!px-6 !py-3 !text-sm"><RotateCcw className="h-4 w-4" /> {t('brd.reset')}</GhostButton>
            </div>
          </div>

          {/* ── Live preview ── */}
          <div className="min-w-0 xl:sticky xl:top-24">
            <Card className="p-5">
              <SectionHead icon={Eye} title={t('brd.preview')} sub="Updates as you pick" />
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10" style={{ background: preview.primaryColor }}>
                <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                  <img src={logo} alt="logo" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <span className="truncate text-lg font-bold" style={{ color: preview.headingColor }}>{preview.companyName || t('brd.companyFb')}</span>
                  <span className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase" style={{ background: `${preview.accentColor}22`, color: preview.accentColor }}>Live</span>
                </div>
                <div className="px-5 py-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: preview.accentColor }}>{preview.companyName || t('brd.companyFb')}</p>
                  <h4 className="mt-1 text-2xl font-extrabold leading-tight" style={{ color: preview.headingColor }}>{preview.tagline || t('brd.taglineFb')}</h4>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: preview.bodyColor }}>A rebranded terminal for your clients — entries, payouts and coaching under your name.</p>
                  <p className="mt-1 text-[11px]" style={{ color: preview.mutedColor }}>Muted captions, timestamps and helper text render in your muted tone.</p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <button className="rounded-xl px-5 py-2.5 text-sm font-bold" style={{ background: preview.accentColor, color: preview.primaryColor }}>{t('brd.getStarted')}</button>
                    <button className="rounded-xl border px-5 py-2.5 text-sm font-bold" style={{ borderColor: preview.accentColor, color: preview.headingColor }}>{t('brd.learnMore')}</button>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-2.5">
                    {[t('brd.statWin'), t('brd.statPf'), t('brd.statBal')].map((l, i) => (
                      <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="text-[10px] uppercase" style={{ color: preview.mutedColor }}>{l}</div>
                        <div className="mt-1 font-mono text-sm font-bold" style={{ color: preview.accentColor }}>{['68%', '2.4', '$12.5K'][i]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#8a8577]">{t('brd.previewSub')}</p>
            </Card>
          </div>
        </div>

        <Note icon={Building2}>
          <p className="text-sm leading-relaxed text-[#c9c4b4]">{t('brd.intro', { brand: 'TradingBible LLC' })}</p>
        </Note>
      </div>
    </AppLayout>
  );
}
