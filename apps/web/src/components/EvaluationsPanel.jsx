// My evaluations pipeline — moved here from ChallengesPage so it lives on
// the Trading Journal page. Self-contained: loads attempts + payouts,
// re-evaluates live attempts and requests bank payouts on passed seats.
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, BadgeDollarSign, Landmark, Trophy } from 'lucide-react';
import { Card, GoldButton, GhostButton } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { txt, numOrNull } from '@/lib/safeRender';
import { API_SERVER_URL } from '@/lib/apiServerClient';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

export default function EvaluationsPanel() {
  const { toast } = useToast();
  const [attempts, setAttempts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, py] = await Promise.all([
        pb.authStore.token
          ? fetch(`${API_SERVER_URL}/challenges/my`, { headers: headers() }).then((r) => r.json()).catch(() => ({ attempts: [] }))
          : { attempts: [] },
        pb.authStore.token
          ? fetch(`${API_SERVER_URL}/challenges/payouts/my`, { headers: headers() }).then((r) => r.json()).catch(() => ({ payouts: [] }))
          : { payouts: [] },
      ]);
      setAttempts(a.attempts || []);
      setPayouts(py.payouts || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const evaluate = async (id) => {
    setBusy(`eval:${id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/challenges/evaluate/${id}`, { method: 'POST', headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'evaluation failed');
      const r = data.result;
      toast({ title: r.status === 'passed' ? 'Phase passed — well traded' : r.failed ? 'Rail breached — attempt ended' : 'Still in play', description: r ? `+${r.profitPct}% · DD ${r.maxDdPct}% · worst day ${r.worstDayPct}% · ${r.days}d` : '' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Evaluation failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const pendingPayoutFor = (attemptId) => payouts.some((p) => p.kind === 'payout_request' && p.status === 'pending' && String(p.reference || '').startsWith(`payout_req:${attemptId}:`));

  const requestPayout = async (id) => {
    if (!window.confirm('Request your payout now? It goes to your TBC wallet once the desk approves — entry fee refunded in TBC on your first payout.')) return;
    setBusy(`payout:${id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/challenges/payout/request`, { method: 'POST', headers: headers(), body: JSON.stringify({ attemptId: id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'request failed');
      toast({ title: 'Payout requested', description: `$${data.payout?.toLocaleString()} on its way — desk review, then straight to your TBC wallet.` });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Payout request failed', description: e.message }); }
    finally { setBusy(''); }
  };

  return (
    <div id="evaluations" className="scroll-mt-24">
      <div className="flex items-center gap-3">
        <h3 className="flex items-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-wide text-[#f0ecdd]"><Trophy className="h-4 w-4 text-[#d4af37]" /> My evaluations</h3>
        <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
        <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{attempts.length}</span>
        <a href="/app/challenges" className="shrink-0 text-xs font-semibold text-[#d4af37] hover:underline">Get a ticket</a>
      </div>
      {attempts.length === 0 ? (
        <p className="mt-3 text-sm text-[#8a8577]">No evaluations yet — pick a ticket on the Challenges page to start.</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {attempts.map((a) => {
            const s = a.stats || {};
            const checks = s.checks || [];
            const passed = checks.filter((c) => c.pass).length;
            const tone = a.status === 'passed' || a.status === 'paid' ? 'emerald' : a.status === 'failed' ? 'red' : 'gold';
            return (
              <Card key={a.id} className="overflow-hidden !p-0">
                <div className={`flex items-center justify-between gap-2 px-5 py-3 ${tone === 'emerald' ? 'bg-emerald-400/10' : tone === 'red' ? 'bg-red-400/10' : 'bg-[#d4af37]/10'}`}>
                  <div className="min-w-0 truncate text-sm font-bold text-[#f0ecdd]">{txt(a.product_name, '—')}</div>
                  <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${tone === 'emerald' ? 'bg-emerald-400/15 text-emerald-400' : tone === 'red' ? 'bg-red-400/15 text-red-400' : 'bg-[#d4af37]/15 text-[#d4af37]'}`}>
                    {a.status === 'passed' || a.status === 'paid' ? <CheckCircle2 className="h-3.5 w-3.5" /> : a.status === 'failed' ? <XCircle className="h-3.5 w-3.5" /> : null}
                    {a.status}
                  </span>
                </div>
                <div className="p-5 pt-4">
                  <div className="font-mono text-[11px] text-[#5f5b50]">
                    {txt(a.account_type, 'standard') !== 'standard' ? `${txt(a.account_type, '')} · ` : ''}{checks.length > 0 ? `${passed}/${checks.length} gates cleared` : 'Awaiting first evaluation'}
                  </div>
                  {checks.length > 0 && (
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/8">
                      <div className={`h-full rounded-full transition-all ${tone === 'emerald' ? 'bg-emerald-400' : tone === 'red' ? 'bg-red-400' : 'bg-[#d4af37]'}`} style={{ width: `${Math.round((passed / checks.length) * 100)}%` }} />
                    </div>
                  )}
                  <div className="mt-2.5 font-mono text-[13px] text-[#c9c4b4]">
                    {s.equity !== undefined ? `Equity $${s.equity?.toLocaleString()} · +${s.profitPct}% · DD ${s.maxDdPct}% · worst day ${s.worstDayPct}% · ${s.days}d · ${s.trades} trades` : 'Log trades in your journal, then re-evaluate.'}
                  </div>
                  {checks.length > 0 && (
                    <div className="mt-2.5 grid grid-cols-1 gap-1 min-[420px]:grid-cols-2">
                      {checks.map((c, ci) => (
                        <div key={c?.id ?? ci} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5 text-xs">
                          <span className={c?.pass ? 'text-emerald-400' : c?.soft ? 'text-[#d4af37]' : 'text-red-400'}>{c?.pass ? '✓' : c?.soft ? '◷' : '✕'}</span>
                          <span className="min-w-0 flex-1 truncate text-[#c9c4b4]">{txt(c?.label, '')}</span>
                          <span className="shrink-0 font-mono text-[#8a8577]">{txt(c?.value, '')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {a.status === 'active' && (
                    <div className="mt-3.5">
                      <GhostButton disabled={busy === `eval:${a.id}`} onClick={() => evaluate(a.id)} className="!px-4 !py-2 !text-xs">
                        {busy === `eval:${a.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Re-evaluate now'}
                      </GhostButton>
                    </div>
                  )}
                  {a.status === 'passed' && (
                    <div className="mt-2.5">
                      <p className="flex items-center gap-1.5 text-xs text-emerald-400"><BadgeDollarSign className="h-3.5 w-3.5" /> Passed — {pendingPayoutFor(a.id) ? 'payout requested, desk is reviewing.' : 'request your payout to your TBC wallet.'}</p>
                      {!pendingPayoutFor(a.id) && (
                        <GoldButton disabled={busy === `payout:${a.id}`} onClick={() => requestPayout(a.id)} className="mt-2 !px-4 !py-2 !text-xs">
                          {busy === `payout:${a.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request payout'}
                        </GoldButton>
                      )}
                    </div>
                  )}
                  {a.status === 'paid' && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400"><Landmark className="h-3.5 w-3.5" /> Reward paid — check your wallet ledger and bank.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {payouts.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <h3 className="whitespace-nowrap text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">Payouts</h3>
            <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
            <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{payouts.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-4 py-2.5 text-xs">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.kind === 'refund' ? 'bg-[#d4af37]/15 text-[#d4af37]' : p.status === 'pending' ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'bg-emerald-400/15 text-emerald-400'}`}>
                  {p.kind === 'refund' ? 'fee refund' : p.kind === 'payout_request' ? 'requested' : 'paid'}
                </span>
                <span className="font-mono font-bold text-[#f0ecdd]">{txt(p.asset, '') === 'TBC' ? `${(numOrNull(p.amount) ?? 0).toLocaleString()} TBC` : `$${(numOrNull(p.amount) ?? 0).toLocaleString()}`}</span>
                <span className="ml-auto font-mono text-[11px] text-[#5f5b50]">{p.created ? new Date(p.created).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
