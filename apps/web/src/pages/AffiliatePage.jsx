import React, { useCallback, useEffect, useState } from 'react';
import { BadgeDollarSign, Copy, Check, Link2, RefreshCw, Share2, Users, MousePointerClick, Banknote } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { affiliateStats, registerAffiliate, claimAffiliatePayout } from '@/lib/affiliate';

const money = (n) => (n || n === 0) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '$0.00';

function statCard(icon, label, value) {
  return (
    <div className="rounded-2xl glass p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold gold-text">{value}</div>
    </div>
  );
}

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

  useEffect(() => { load(); }, [load]);

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
      toast({ title: t('afl.payoutReq'), description: t('afl.payoutReqDesc', { n: res.claimed }) });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: t('afl.claimFail'), description: err?.message || t('afl.tryAgain') });
    } finally { setClaiming(false); }
  };

  const pending = Number(data?.pending || 0);
  const paid = Number(data?.paid || 0);

  return (
    <AppLayout title={t('afl.pageTitle')}>
      <PageHeader
        icon={Share2}
        kicker={t('afl.kicker')}
        description={t('afl.desc', { pct: (data?.rate || 15) * 100 })}
      />

      {loading ? (
        <div className="grid place-items-center py-16 text-sm text-[#8a8577]">{t('afl.loading')}</div>
      ) : !data?.code ? (
        <div className="rounded-2xl glass p-10 text-center">
          <Share2 className="mx-auto h-10 w-10 text-[#d4af37]/60" />
          <h3 className="mt-3 text-base font-semibold text-[#f0ecdd]">{t('afl.noCode')}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#8a8577]">{t('afl.noCodeSub')}</p>
        </div>
      ) : (
        <>
          <div className="mb-6 overflow-hidden rounded-2xl border border-[#d4af37]/15 bg-gradient-to-r from-[#d4af37]/[0.08] via-transparent to-transparent p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><Link2 className="h-4 w-4 text-[#d4af37]" /> {t('afl.refLink')}</div>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-mono text-sm text-[#f0ecdd]">{link}</span>
                  <span className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#d4af37]">REF:{refCode.toUpperCase()}</span>
                </div>
              </div>
              <button onClick={copy} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t('afl.copied') : t('afl.copyLink')}
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCard(<MousePointerClick className="h-4 w-4" />, t('afl.clicks'), data?.clicks ?? 0)}
            {statCard(<Users className="h-4 w-4" />, t('afl.signups'), data?.signups ?? 0)}
            {statCard(<BadgeDollarSign className="h-4 w-4" />, t('afl.pendingEarn'), money(pending))}
            {statCard(<Banknote className="h-4 w-4" />, t('afl.paid'), money(paid))}
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium uppercase tracking-wider text-[#8a8577]">{t('afl.refHistory')}</h3>
            <button onClick={claim} disabled={claiming || pending <= 0} className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/25 px-4 py-2 text-sm font-semibold text-[#e9e7df] transition hover:border-[#d4af37]/60 disabled:cursor-not-allowed disabled:opacity-50">
              {claiming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />} {t('afl.requestPayout')}
            </button>
          </div>

          <div className="glass no-scrollbar overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">{[t('afl.thEmail'), t('afl.thDate'), t('afl.thPlan'), t('afl.thCommission'), t('afl.thStatus')].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {!data?.referrals?.length ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8a8577]">{t('afl.noRefs')}</td></tr>
                ) : data.referrals.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-[#f0ecdd]">{r.email}</td>
                    <td className="px-4 py-3 text-[#c9c4b4]">{new Date(r.created).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="px-4 py-3 text-[#c9c4b4]">{r.plan || t('afl.notSubbed')}</td>
                    <td className="px-4 py-3 font-mono text-[#c9c4b4]">{money(r.commission)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[r.status] || 'bg-white/10 text-[#8a8577]'}`}>{t(`afl.st_${r.status}`, null, r.status.replace('_', ' '))}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppLayout>
  );
}