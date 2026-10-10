import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, Copy, Check, Link2, RefreshCw, Share2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, EmptyState, GhostButton, GoldButton, PageHero, SectionHead, Stat, StatGrid } from '@/components/ui-kit';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { affiliateStats, registerAffiliate, claimAffiliatePayout } from '@/lib/affiliate';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const STATUS_STYLE = {
  signed_up: 'bg-white/10 text-[#c9c4b4]',
  active: 'bg-emerald-500/15 text-emerald-400',
  pending_payout: 'bg-orange-500/15 text-orange-400',
  paid: 'bg-[#d4af37]/15 text-[#d4af37]',
};

export default function AffiliatePage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res = await affiliateStats();
      if (!res?.code) res = await registerAffiliate();
      setData(res);
    } catch {
      try { setData(await registerAffiliate()); } catch { setData(null); }
    } finally { setLoading(false); }
  }, []);

  const [lastSync, setLastSync] = useState(null);
  const [tbcRate, setTbcRate] = useState(1 / 3.25); // 1 TBC = 1 KWD, NOT 1 USD

  useEffect(() => {
    fetch(`${API_SERVER_URL}/tbc/econ`).then((r) => r.json()).then((d) => {
      const rt = Number(d?.tbcPerUsd);
      if (rt > 0.15 && rt < 0.6) setTbcRate(rt); // 1 TBC = 1 KWD — reject 1:1
      else if (Number(d?.usdPerKwd) >= 2 && Number(d?.usdPerKwd) <= 5) setTbcRate(1 / Number(d.usdPerKwd));
    }).catch(() => {});
  }, []);

  const loadQuiet = useCallback(async () => {
    try {
      let res = await affiliateStats();
      if (!res?.code) res = await registerAffiliate();
      setData(res);
      setLastSync(new Date());
    } catch { /* keep stale data on background failures */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live sync: refresh stats every 30s while the page is visible
  useEffect(() => {
    if (document.hidden) return undefined;
    const id = setInterval(() => { if (!document.hidden) loadQuiet(); }, 30000);
    const onVis = () => { if (!document.hidden) loadQuiet(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [loadQuiet]);

  const link = data?.code ? `${window.location.origin}/signup?ref=${encodeURIComponent(data.code)}` : '';
  const refCode = data?.code || '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast({ title: t('afl.linkCopied'), description: t('afl.linkCopiedSub') });
    } catch {
      toast({ title: t('afl.copyManually'), description: link });
    }
  };

  const claim = async () => {
    setClaiming(true);
    try {
      const res = await claimAffiliatePayout();
      toast({ title: res.tbc > 0 ? `Paid ${res.tbc} TBC` : t('afl.payoutReq'), description: res.tbc > 0 ? `${res.claimed} referral${res.claimed === 1 ? '' : 's'} · $${res.usd} → ${res.tbc} TBC @ ${res.rate}` : t('afl.payoutReqDesc', { n: res.claimed }) });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: t('afl.claimFail'), description: err?.message || t('afl.tryAgain') });
    } finally { setClaiming(false); }
  };

  const pending = Number(data?.pending || 0);
  const paid = Number(data?.paid || 0);

  return (
    <AppLayout title={t('afl.pageTitle')}>
      <div className="tb-page">
      <section className="tb-hero overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#d4af37]/15 blur-[100px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]">
              <Share2 className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold tracking-tight text-[#f0ecdd] sm:text-2xl">{t('afl.pageTitle')}</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#8a8577] sm:text-sm">{t('afl.desc', { pct: (data?.rate || 15) * 100 })}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {lastSync && <span className="hidden text-[11px] text-[#6a665a] sm:inline">Synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            <button type="button" onClick={loadQuiet} aria-label="Refresh stats" title="Refresh stats" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-[#8a8577] transition hover:border-[#d4af37]/40 hover:text-[#d4af37]">
              <RefreshCw className="h-4 w-4" />
            </button>
            {data?.code && (
              <span className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-[#d4af37]">REF:{refCode.toUpperCase()}</span>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <Card><div className="flex items-center justify-center gap-2 py-10 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" />{t('afl.loading')}</div></Card>
      ) : !data?.code ? (
        <EmptyState icon={Share2} title={t('afl.noCode')} sub={t('afl.noCodeSub')} />
      ) : (
        <>
          <Card>
            <SectionHead icon={Link2} title={t('afl.refLink')} />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 font-mono text-sm text-[#f0ecdd]">{link}</code>
              <GoldButton onClick={copy} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t('afl.copied') : t('afl.copyLink')}
              </GoldButton>
            </div>
          </Card>

          <StatGrid cols={4}>
            <Stat label={t('afl.clicks')} value={data?.clicks ?? 0} />
            <Stat label={t('afl.signups')} value={data?.signups ?? 0} />
            <Stat label={`${t('afl.pendingEarn')} · TBC`} value={`${(Math.round(pending * tbcRate * 100) / 100).toLocaleString()} TBC`} tone="text-[#d4af37]" />
            <Stat label={`${t('afl.paid')} · TBC`} value={`${(Math.round(paid * tbcRate * 100) / 100).toLocaleString()} TBC`} tone="text-emerald-400" />
          </StatGrid>
          <p className="-mt-1 text-xs text-[#8a8577]">Paid in TBC at {tbcRate} TBC per $1 — spendable on challenges, signals and mentorship, claimable on-chain at launch.</p>

          <div className="mb-3 flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0ecdd]">{t('afl.refHistory')}</h3>
            <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
            <GhostButton onClick={claim} disabled={claiming || pending <= 0} className="!min-h-[40px] !px-4 !py-2 !text-xs">
              {claiming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />} {t('afl.requestPayout')}
            </GhostButton>
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b border-[#d4af37]/12 bg-white/[0.02] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">{[t('afl.thEmail'), t('afl.thDate'), t('afl.thPlan'), t('afl.thCommission'), t('afl.thStatus')].map((h) => <th key={h} className="px-5 py-3.5">{h}</th>)}</tr></thead>
              <tbody>
                {!data?.referrals?.length ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-[#6a665a]"><Share2 className="h-5 w-5" /></div><p className="mt-3 text-sm text-[#8a8577]">{t('afl.noRefs')}</p></td></tr>
                ) : data.referrals.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 transition last:border-0 hover:bg-[#d4af37]/[0.04]">
                    <td className="px-5 py-3.5 font-medium text-[#f0ecdd]">{r.email}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[#c9c4b4]">{new Date(r.created).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="px-4 py-3.5 text-[#c9c4b4]">{r.plan || t('afl.notSubbed')}</td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-[#d4af37]">{(Math.round(Number(r.commission) * tbcRate * 100) / 100).toLocaleString()} <span className="text-[10px]">TBC</span></td>
                    <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[r.status] || 'bg-white/10 text-[#8a8577]'}`}>{t(`afl.st_${r.status}`, null, r.status.replace('_', ' '))}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        </>
      )}
      </div>
    </AppLayout>
  );
}