import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, Copy, Check, Link2, RefreshCw, Share2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, EmptyState, GhostButton, GoldButton, PageHero, SectionHead, Stat, StatGrid } from '@/components/ui-kit';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { affiliateStats, registerAffiliate, claimAffiliatePayout } from '@/lib/affiliate';

const money = (n) => (n || n === 0) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '$0.00';

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
      <div className="tb-page">
      <PageHero
        kicker={t('afl.kicker')}
        kickerIcon={Share2}
        subtitle={t('afl.desc', { pct: (data?.rate || 15) * 100 })}
      />

      {loading ? (
        <Card><p className="py-10 text-center text-sm text-[#8a8577]">{t('afl.loading')}</p></Card>
      ) : !data?.code ? (
        <EmptyState icon={Share2} title={t('afl.noCode')} sub={t('afl.noCodeSub')} />
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><Link2 className="h-4 w-4 text-[#d4af37]" /> {t('afl.refLink')}</div>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-mono text-sm text-[#f0ecdd]">{link}</span>
                  <span className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#d4af37]">REF:{refCode.toUpperCase()}</span>
                </div>
              </div>
              <GoldButton onClick={copy} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t('afl.copied') : t('afl.copyLink')}
              </GoldButton>
            </div>
          </Card>

          <StatGrid cols={4}>
            <Stat label={t('afl.clicks')} value={data?.clicks ?? 0} />
            <Stat label={t('afl.signups')} value={data?.signups ?? 0} />
            <Stat label={t('afl.pendingEarn')} value={money(pending)} />
            <Stat label={t('afl.paid')} value={money(paid)} />
          </StatGrid>

          <SectionHead
            title={t('afl.refHistory')}
            right={(
              <GhostButton onClick={claim} disabled={claiming || pending <= 0}>
                {claiming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />} {t('afl.requestPayout')}
              </GhostButton>
            )}
          />

          <Card>
            <div className="no-scrollbar overflow-x-auto">
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
          </Card>
        </>
      )}
      </div>
    </AppLayout>
  );
}