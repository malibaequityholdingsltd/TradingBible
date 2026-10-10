import React, { useMemo, useState } from 'react';
import { Coins, Loader2, Lock, Percent, ShieldCheck, Timer, Users, Zap } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, GoldButton, GhostButton, Note } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import {
  STAKING_PARAMS, getValidators, getStakingAccount,
  delegate, undelegate, unbondingCountdown,
} from '@/lib/staking';

const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 font-mono text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 min-h-[44px]';

function Stat({ label, value, tone = 'text-[#f0ecdd]' }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#5f5b50]">{label}</div>
      <div className={`mt-1 font-mono text-xl font-extrabold ${tone}`}>{value}</div>
    </div>
  );
}

export default function StakingPage() {
  const { toast } = useToast();
  const [account, setAccount] = useState(() => getStakingAccount());
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState('');
  const validators = useMemo(() => getValidators(), []);

  const refresh = () => setAccount(getStakingAccount());

  const doDelegate = (id, name) => {
    setBusy(`del:${id}`);
    try {
      setAccount(delegate(id, amount));
      toast({ title: `Delegated ${Number(amount).toLocaleString()} TBC`, description: `Preview stake with ${name} — rewards accrue illustratively.` });
      setAmount('');
    } catch (e) { toast({ variant: 'destructive', title: 'Delegate failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const doUndelegate = (id, max) => {
    const raw = window.prompt(`Undelegate from this validator? Enter TBC (max ${max.toLocaleString()}). Unbonding takes ${STAKING_PARAMS.unbondingDays} days.`, String(max));
    if (raw === null) return;
    setBusy(`und:${id}`);
    try {
      setAccount(undelegate(id, raw));
      toast({ title: 'Unbonding started', description: `Funds release in ${STAKING_PARAMS.unbondingDays} days.` });
    } catch (e) { toast({ variant: 'destructive', title: 'Undelegate failed', description: e.message }); }
    finally { setBusy(''); }
  };

  return (
    <AppLayout title="Staking">
      <div className="tb-page !max-w-[1400px]">
        <PageHero
          kickerIcon={Coins}
          kicker="TBC Staking · Testnet preview"
          title="Put TBC"
          accent="to work"
          subtitle={`Delegate to validators, earn illustrative rewards, unbond over ${STAKING_PARAMS.unbondingDays} days. Live staking opens with the network — positions shown here are a working preview.`}
        />

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Stat label="My bonded" value={`${account.bonded.toLocaleString()} TBC`} tone="text-[#d4af37]" />
          <Stat label="Est. rewards" value={`${account.rewards.toLocaleString()} TBC`} tone="text-emerald-400" />
          <Stat label="Unbonding" value={account.unbonding.length ? `${account.unbonding.length} batch${account.unbonding.length > 1 ? 'es' : ''}` : '—'} />
          <Stat label="Subsidy cap" value={`${STAKING_PARAMS.subsidyCapApr * 100}% APR`} />
        </div>

        {/* Unbonding countdown */}
        {account.unbonding.length > 0 && (
          <Card className="mt-4 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]"><Timer className="h-4 w-4 text-[#d4af37]" /> Unbonding · {STAKING_PARAMS.unbondingDays}-day release</div>
            <div className="mt-3 space-y-2">
              {account.unbonding.map((u) => {
                const c = unbondingCountdown(u.releaseAt);
                const v = validators.find((x) => x.id === u.validatorId);
                return (
                  <div key={u.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Lock className="h-3.5 w-3.5 text-[#8a8577]" />
                    <span className="font-mono font-bold text-[#f0ecdd]">{u.amount.toLocaleString()} TBC</span>
                    <span className="text-xs text-[#8a8577]">from {v?.name || u.validatorId}</span>
                    <span className="ml-auto font-mono text-xs text-[#d4af37]">{c.text}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Chain rules */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
          {[
            ['Unbonding', `${STAKING_PARAMS.unbondingDays} days`],
            ['Max commission', `${STAKING_PARAMS.maxCommission * 100}%`],
            ['Min self-bond', `${STAKING_PARAMS.minSelfBond.toLocaleString()} TBC`],
            ['Active set', `${STAKING_PARAMS.activeSetCap} validators`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/5 bg-black/30 px-3 py-2.5">
              <div className="font-bold uppercase tracking-wider text-[#5f5b50]">{k}</div>
              <div className="mt-0.5 font-mono text-[13px] font-bold text-[#f0ecdd]">{v}</div>
            </div>
          ))}
        </div>

        {/* Validators */}
        <Card className="mt-4 !p-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">Validators</h3>
            <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{validators.length}</span>
            <div className="ml-auto flex w-full max-w-xs items-center gap-2">
              <input className={input} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="TBC amount" aria-label="Stake amount" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-y border-white/5 text-[11px] uppercase tracking-wider text-[#6a665a]">
                  <th className="px-5 py-3 font-medium">Validator</th>
                  <th className="px-5 py-3 font-medium">Power</th>
                  <th className="px-5 py-3 font-medium">Commission</th>
                  <th className="px-5 py-3 font-medium">Uptime</th>
                  <th className="px-5 py-3 font-medium">Est. APR</th>
                  <th className="px-5 py-3 font-medium">My stake</th>
                  <th className="px-5 py-3 font-medium"><span className="sr-only">Delegate</span></th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-b [&_tr]:border-white/5 [&_tr:last-child]:border-0">
                {validators.map((v) => {
                  const mine = Number(account.delegations[v.id]) || 0;
                  return (
                    <tr key={v.id} className="transition hover:bg-[#d4af37]/[0.04]">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 font-bold text-[#f0ecdd]"><ShieldCheck className="h-4 w-4 shrink-0 text-[#d4af37]" />{v.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-[#5f5b50]">{v.status === 'active' ? 'accepting' : 'candidate'} · self-bond {v.selfBond.toLocaleString()}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[#c9c4b4]">{v.votingPower.toLocaleString()}</td>
                      <td className="px-5 py-3.5 font-mono text-[#c9c4b4]">{(v.commission * 100).toFixed(0)}%</td>
                      <td className="px-5 py-3.5 font-mono text-[#c9c4b4]">{v.uptime.toFixed(1)}%</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-400">{v.apr.toFixed(1)}%</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[#f0ecdd]">{mine > 0 ? mine.toLocaleString() : '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5">
                          <GoldButton disabled={busy === `del:${v.id}` || v.status !== 'active'} onClick={() => doDelegate(v.id, v.name)} className="!min-h-[40px] !px-4 !py-1.5 !text-xs">
                            {busy === `del:${v.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delegate'}
                          </GoldButton>
                          {mine > 0 && (
                            <GhostButton disabled={busy === `und:${v.id}`} onClick={() => doUndelegate(v.id, mine)} className="!min-h-[40px] !px-3 !py-1.5 !text-xs">Undelegate</GhostButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Note icon={Zap}>
          Testnet preview — validators, APRs and rewards are illustrative scenario figures (capped at the 8% subsidy envelope, never promised returns). Real delegation, slashing and 21-day unbonding activate with the network; this interface points at RPC then, no redesign needed.
        </Note>

        <div className="mt-3 flex items-center gap-2 text-xs text-[#8a8577]">
          <Users className="h-3.5 w-3.5" /> Double-sign slashes {(STAKING_PARAMS.slashDoubleSign * 100).toFixed(0)}% plus tombstoning · downtime slashes {(STAKING_PARAMS.slashDowntime * 100).toFixed(2)}% plus jail · <Percent className="h-3.5 w-3.5" /> commission changes capped at {STAKING_PARAMS.commissionChangeMaxPerDay * 100}pp daily.
        </div>
      </div>
    </AppLayout>
  );
}
