import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Wallet, Building2, ArrowRight } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useI18n } from '@/lib/i18n';
import { fmtMoney } from '@/lib/mockData';

function BalanceCard({ icon: Icon, label, total, count, empty, emptyLabel, to, cta, t }) {
  const connected = count > 0;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[#8a8577] sm:text-xs">{label}</span>
        <Icon className="h-4 w-4 text-[#d4af37]" />
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold text-[#f0ecdd]">{fmtMoney(total)}</div>
      {connected ? (
        <div className="mt-1 text-xs text-emerald-400">{t('acct.connectedN', { n: count, s: count === 1 ? '' : 's' })}</div>
      ) : (
        <div className="mt-1 text-xs text-[#8a8577]">{empty}</div>
      )}
      <Link to={to} className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-[#d4af37]/25 py-2 text-xs font-semibold text-[#e9e7df] transition hover:border-[#d4af37]/60">
        {connected ? cta : emptyLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default function AccountBalances() {
  const { loading, live, prop, liveTotal, propTotal, cryptoTotal } = useAccounts();
  const { t } = useI18n();

  if (loading) {
    return <div className="glass rounded-2xl py-10 text-center text-sm text-[#8a8577]">{t('acct.loadingBal')}</div>;
  }

  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
      <BalanceCard
        icon={Wallet}
        label={t('acct.liveBal')}
        total={liveTotal}
        count={live.length}
        empty={t('acct.noBrokers')}
        emptyLabel={t('acct.connectBroker')}
        cta={t('acct.manageBrokers')}
        to="/app/brokers"
        t={t}
      />
      <BalanceCard
        icon={Building2}
        label={t('acct.propBal')}
        total={propTotal}
        count={prop.length}
        empty={t('acct.noProp')}
        emptyLabel={t('acct.connectProp')}
        cta={t('acct.manageProp')}
        to="/app/brokers"
        t={t}
      />
      <BalanceCard
        icon={Landmark}
        label={t('acct.walletBal')}
        total={cryptoTotal}
        count={cryptoTotal > 0 ? 1 : 0}
        empty={t('acct.noDeposits')}
        emptyLabel={t('acct.makeDeposit')}
        cta={t('acct.openWallet')}
        to="/app/wallet"
        t={t}
      />
    </div>
  );
}
