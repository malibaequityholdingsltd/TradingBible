import React, { useEffect, useState } from 'react';
import { Save, RotateCcw, Building2, Eye } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const MALIBA_LOGO = 'https://horizons-cdn.hostinger.com/31a01204-0f8d-4aa3-a78b-78fb8b946e53/5c8275966b855914cc3eec21e6f6ed03.png';

const DEFAULTS = {
  companyName: 'TradingBible',
  primaryColor: '#0a0a0f',
  accentColor: '#d4af37',
  logoUrl: 'https://horizons-cdn.hostinger.com/31a01204-0f8d-4aa3-a78b-78fb8b946e53/f18f53c1fa5ec4181c7033589080fd00.png',
  tagline: 'Trade like the 1%. Journal like a fund.',
};

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50';

export default function BrandingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(DEFAULTS);
  const [recordId, setRecordId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rec = await pb.collection('branding_settings').getFirstListItem(`owner = "${user.id}"`);
        setRecordId(rec.id);
        setForm({
          companyName: rec.companyName || DEFAULTS.companyName,
          primaryColor: rec.primaryColor || DEFAULTS.primaryColor,
          accentColor: rec.accentColor || DEFAULTS.accentColor,
          logoUrl: rec.logoUrl || DEFAULTS.logoUrl,
          tagline: rec.tagline || DEFAULTS.tagline,
        });
      } catch { /* none yet */ }
    })();
  }, [user.id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = { ...form, owner: user.id };
      if (recordId) await pb.collection('branding_settings').update(recordId, data);
      else { const rec = await pb.collection('branding_settings').create(data); setRecordId(rec.id); }
      toast({ title: 'Branding saved', description: 'Your white-label theme has been applied.' });
    } catch {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Please try again.' });
    } finally { setBusy(false); }
  };

  const reset = () => setForm(DEFAULTS);

  return (
    <AppLayout title="White-label Branding">
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/[0.06] p-4">
        <img src={MALIBA_LOGO} alt="MALIBA EQUITY HOLDINGS LTD" className="h-11 w-11 shrink-0 rounded-lg object-contain" />
        <p className="text-sm text-[#c9c4b4]">White-label branding is a <span className="text-[#d4af37]">MALIBA EQUITY HOLDINGS LTD</span> program. Resellers and prop firms can rebrand the platform with a custom company name, logo, colors and tagline. Changes here shape the client-facing experience for your seats.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={save} className="glass rounded-2xl p-6">
          <h3 className="mb-5 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Building2 className="h-4 w-4 text-[#d4af37]" /> Brand settings</h3>
          <div className="space-y-4">
            <div><label className="mb-1.5 block text-xs text-[#8a8577]">Company name</label><input className={input} value={form.companyName} onChange={set('companyName')} placeholder="Your company" /></div>
            <div><label className="mb-1.5 block text-xs text-[#8a8577]">Tagline</label><input className={input} value={form.tagline} onChange={set('tagline')} placeholder="Your slogan" /></div>
            <div><label className="mb-1.5 block text-xs text-[#8a8577]">Logo URL</label><input className={input} value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://…" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="mb-1.5 block text-xs text-[#8a8577]">Primary (background)</label>
                <div className="flex items-center gap-2"><input type="color" value={form.primaryColor} onChange={set('primaryColor')} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent" /><input className={input} value={form.primaryColor} onChange={set('primaryColor')} /></div>
              </div>
              <div><label className="mb-1.5 block text-xs text-[#8a8577]">Accent color</label>
                <div className="flex items-center gap-2"><input type="color" value={form.accentColor} onChange={set('accentColor')} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent" /><input className={input} value={form.accentColor} onChange={set('accentColor')} /></div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button disabled={busy} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] disabled:opacity-60"><Save className="h-4 w-4" /> Save branding</button>
            <button type="button" onClick={reset} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2.5 text-sm text-[#e9e7df]"><RotateCcw className="h-4 w-4" /> Reset</button>
          </div>
        </form>

        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Eye className="h-4 w-4 text-[#d4af37]" /> Live preview</h3>
          <div className="overflow-hidden rounded-2xl border border-white/10" style={{ background: form.primaryColor }}>
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              {form.logoUrl && <img src={form.logoUrl} alt="logo" className="h-9 w-9 rounded-lg object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
              <span className="text-lg font-semibold text-white">{form.companyName || 'Company'}</span>
            </div>
            <div className="px-5 py-8">
              <h4 className="text-xl font-bold text-white">{form.tagline || 'Your tagline here'}</h4>
              <p className="mt-2 text-sm text-white/60">A rebranded terminal for your clients.</p>
              <div className="mt-5 flex gap-3">
                <button className="rounded-xl px-5 py-2.5 text-sm font-semibold" style={{ background: form.accentColor, color: form.primaryColor }}>Get started</button>
                <button className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-white" style={{ borderColor: form.accentColor }}>Learn more</button>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {['Win Rate', 'Profit Factor', 'Balance'].map((l) => (
                  <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="text-[10px] uppercase text-white/40">{l}</div>
                    <div className="mt-1 font-mono text-sm font-semibold" style={{ color: form.accentColor }}>—</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#8a8577]">Preview reflects your saved brand across the client dashboard, emails and login.</p>
        </div>
      </div>
    </AppLayout>
  );
}
