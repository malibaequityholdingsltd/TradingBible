import React, { useState } from 'react';
import { Lock, ShieldCheck, Smartphone, KeyRound, Monitor, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const SESSIONS = [
  { device: 'Chrome · macOS', where: 'London, UK', last: 'Active now', current: true },
  { device: 'Safari · iPhone', where: 'London, UK', last: '2 hours ago' },
  { device: 'Firefox · Windows', where: 'Manchester, UK', last: '3 days ago' },
];

export default function SecurityPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(!!user?.mfaEnabled);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !enabled;
    setBusy(true);
    try {
      await updateProfile({ mfaEnabled: next });
      setEnabled(next);
      toast({ title: next ? 'Two-factor enabled' : 'Two-factor disabled', description: next ? 'You will be asked for an emailed code at each login.' : 'Email verification is no longer required to sign in.' });
    } catch {
      toast({ variant: 'destructive', title: 'Update failed', description: 'Please try again.' });
    } finally { setBusy(false); }
  };

  return (
    <AppLayout title="Security">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${enabled ? 'bg-emerald-400/12 text-emerald-400' : 'bg-[#d4af37]/12 text-[#d4af37]'}`}><ShieldCheck className="h-6 w-6" /></div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#f0ecdd]">Two-Factor Authentication (2FA)</h3>
                <button onClick={toggle} disabled={busy} role="switch" aria-checked={enabled} className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${enabled ? 'bg-emerald-500' : 'bg-white/15'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <p className="mt-1 text-sm text-[#8a8577]">Add an extra layer of security. When enabled, a one-time verification code is emailed to you each time you sign in.</p>
              <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${enabled ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#d4af37]/10 text-[#d4af37]'}`}>
                <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-[#d4af37]'}`} /> {enabled ? 'Active — email code required at login' : 'Inactive'}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Smartphone, t: 'Email codes', d: '6-digit one-time codes, valid 5 minutes' },
              { icon: KeyRound, t: 'Session-based', d: 'Verification window lasts 30 minutes' },
              { icon: Lock, t: 'Account-wide', d: 'Protects login from every device' },
            ].map((f) => (
              <div key={f.t} className="rounded-xl bg-white/[0.03] p-4"><f.icon className="h-5 w-5 text-[#d4af37]" /><div className="mt-2 text-sm font-medium text-[#e9e7df]">{f.t}</div><div className="mt-0.5 text-xs text-[#8a8577]">{f.d}</div></div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><AlertTriangle className="h-4 w-4 text-[#d4af37]" /> Security tips</h3>
          <ul className="space-y-3 text-sm text-[#c9c4b4]">
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> Use one-time email codes only and never share them.</li>
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> Keep 2FA enabled for broker-connected accounts.</li>
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> Never share verification codes — we will never ask for them.</li>
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> Review active sessions and sign out unknown devices.</li>
          </ul>
        </div>
      </div>

      <div className="mt-5 glass rounded-2xl p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Monitor className="h-4 w-4 text-[#d4af37]" /> Active sessions</h3>
        <div className="space-y-2">
          {SESSIONS.map((s) => (
            <div key={s.device} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
              <div><div className="text-sm font-medium text-[#e9e7df]">{s.device} {s.current && <span className="ml-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-400">This device</span>}</div><div className="text-xs text-[#8a8577]">{s.where} · {s.last}</div></div>
              {!s.current && <button className="text-xs text-red-400 hover:underline">Revoke</button>}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
