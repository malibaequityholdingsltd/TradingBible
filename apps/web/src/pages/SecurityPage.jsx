import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Lock, ShieldCheck, Smartphone, KeyRound, Monitor, AlertTriangle, Plus, Trash2, Fingerprint, CheckCircle2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { totpStatus, totpSetup, totpEnable, totpDisable, registerPasskey, passkeyStatus, removePasskey } from '@/lib/security';

function normalizeCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

export default function SecurityPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  // Authenticator app (TOTP)
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(true);
  const [setupSecret, setSetupSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);

  // Face ID / passkeys
  const [passkeys, setPasskeys] = useState([]);
  const [pkBusy, setPkBusy] = useState(false);
  const [pkLoading, setPkLoading] = useState(true);
  const passkeySupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  // Login notifications
  const settings = user?.user_settings || {};
  const [notifyMode, setNotifyMode] = useState(settings.loginNotifications !== false ? 'email' : 'off');
  const [notifyBusy, setNotifyBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [tStatus, pStatus] = await Promise.all([totpStatus(), passkeyStatus()]);
        if (!mounted) return;
        setTotpEnabled(!!tStatus?.enabled);
        setPasskeys(pStatus?.passkeys || []);
      } catch { /* API unavailable — leave defaults */
      } finally {
        if (mounted) { setTotpLoading(false); setPkLoading(false); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const beginTotpSetup = async () => {
    setTotpBusy(true);
    try {
      const result = await totpSetup();
      setSetupSecret(result.secret);
      const url = await QRCode.toDataURL(result.uri, { margin: 1, width: 240, color: { dark: '#f0ecdd', light: '#00000000' } });
      setQrDataUrl(url);
      setTotpCode('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not start setup', description: String(err?.message || 'Please try again.') });
    } finally { setTotpBusy(false); }
  };

  const confirmTotp = async (e) => {
    e.preventDefault();
    const code = normalizeCode(totpCode);
    if (code.length !== 6) {
      toast({ variant: 'destructive', title: 'Enter the 6-digit code', description: 'Open your authenticator app and enter the current code.' });
      return;
    }
    setTotpBusy(true);
    try {
      await totpEnable(code);
      setTotpEnabled(true);
      setSetupSecret('');
      setQrDataUrl('');
      setTotpCode('');
      toast({ title: 'Authenticator enabled', description: 'You will be asked for a 6-digit code at each login.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Code rejected', description: String(err?.message || 'Check the code and try again.') });
    } finally { setTotpBusy(false); }
  };

  const disableTotp = async (e) => {
    e.preventDefault();
    const code = normalizeCode(totpCode);
    if (code.length !== 6) {
      toast({ variant: 'destructive', title: 'Enter your current code', description: 'We need a valid code from your authenticator app to disable 2FA.' });
      return;
    }
    setTotpBusy(true);
    try {
      await totpDisable(code);
      setTotpEnabled(false);
      setTotpCode('');
      toast({ title: 'Authenticator disabled', description: 'Two-factor codes are no longer required at login.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Code rejected', description: String(err?.message || 'Check the code and try again.') });
    } finally { setTotpBusy(false); }
  };

  const addPasskey = async () => {
    setPkBusy(true);
    try {
      await registerPasskey();
      const pStatus = await passkeyStatus();
      setPasskeys(pStatus?.passkeys || []);
      toast({ title: 'Face ID / passkey added', description: 'You can now sign in with Face ID on this device.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not add passkey', description: String(err?.message || 'Please try again.') });
    } finally { setPkBusy(false); }
  };

  const deletePasskey = async (credId) => {
    try {
      await removePasskey(credId);
      setPasskeys((prev) => prev.filter((p) => p.credId !== credId));
      toast({ title: 'Passkey removed', description: 'Face ID sign-in is no longer available for that device.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not remove passkey', description: String(err?.message || 'Please try again.') });
    }
  };

  const toggleNotifications = async (mode) => {
    setNotifyBusy(true);
    try {
      const merged = { ...(user?.user_settings || {}), loginNotifications: mode === 'off' ? false : true };
      await updateProfile({ user_settings: merged });
      setNotifyMode(mode);
      toast({ title: mode === 'off' ? 'Login notifications off' : 'Login notifications on', description: mode === 'off' ? 'You will no longer receive emails about new sign-ins.' : 'We will email you whenever a new device signs in.' });
    } catch {
      toast({ variant: 'destructive', title: 'Update failed', description: 'Please try again.' });
    } finally { setNotifyBusy(false); }
  };

  return (
    <AppLayout title="Security">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${totpEnabled ? 'bg-emerald-400/12 text-emerald-400' : 'bg-[#d4af37]/12 text-[#d4af37]'}`}><ShieldCheck className="h-6 w-6" /></div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#f0ecdd]">Authenticator app (2FA)</h3>
                {!setupSecret && <button
                  onClick={totpEnabled ? () => beginTotpSetup() : beginTotpSetup}
                  disabled={totpLoading || totpBusy}
                  className="min-h-[44px] rounded-lg bg-[#d4af37] px-4 text-sm font-semibold text-black transition hover:bg-[#e3c24f] disabled:opacity-60"
                >{totpLoading ? 'Loading…' : (totpEnabled ? 'Change secret' : 'Enable')}</button>}
              </div>
              <p className="mt-1 text-sm text-[#8a8577]">Use Google Authenticator, Authy or any TOTP app. When enabled, a 6-digit code is required at login — the strongest protection against stolen passwords.</p>
              <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${totpEnabled ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#d4af37]/10 text-[#d4af37]'}`}>
                <span className={`h-2 w-2 rounded-full ${totpEnabled ? 'bg-emerald-400' : 'bg-[#d4af37]'}`} /> {totpEnabled ? 'Active — authenticator code required at login' : 'Inactive'}
              </div>
            </div>
          </div>

          {setupSecret && !totpEnabled && (
            <form onSubmit={confirmTotp} className="mt-6 grid gap-4 rounded-2xl border border-[#d4af37]/20 bg-black/20 p-5 sm:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center justify-center gap-2">
                {qrDataUrl ? <img src={qrDataUrl} alt="Scan with your authenticator app" className="h-40 w-40 rounded-xl bg-transparent" /> : <div className="h-40 w-40 animate-pulse rounded-xl bg-white/10" />}
                <span className="text-[11px] text-[#8a8577]">Scan with your authenticator app</span>
              </div>
              <div className="flex flex-col justify-center gap-3">
                <p className="text-sm text-[#c9c4b4]">Can't scan? Enter this secret manually:</p>
                <code className="select-all rounded-lg bg-white/[0.06] px-3 py-2 text-xs tracking-widest text-[#d4af37]">{setupSecret.replace(/(.{4})/g, '$1 ').trim()}</code>
                <FieldRow label="Current 6-digit code" value={totpCode} onChange={setTotpCode} busy={totpBusy} buttonLabel="Verify & enable" disabled={!totpCode} />
              </div>
            </form>
          )}

          {totpEnabled && !setupSecret && (
            <form onSubmit={disableTotp} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-xs text-[#8a8577]">Enter a current code to disable two-factor authentication</label>
                <input value={totpCode} onChange={(e) => setTotpCode(normalizeCode(e.target.value))} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="min-h-[44px] w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/50" />
              </div>
              <button disabled={totpBusy || normalizeCode(totpCode).length !== 6} className="min-h-[44px] self-end rounded-lg border border-red-400/40 px-4 text-sm font-semibold text-red-400 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50">Disable 2FA</button>
            </form>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Smartphone, t: 'Authenticator codes', d: '6-digit codes from your phone, valid 30 seconds' },
              { icon: KeyRound, t: 'Offline & private', d: 'Secrets are stored on your device, never on a server' },
              { icon: Lock, t: 'Account-wide', d: 'Protects login from every device' },
            ].map((f) => (
              <div key={f.t} className="rounded-xl bg-white/[0.03] p-4"><f.icon className="h-5 w-5 text-[#d4af37]" /><div className="mt-2 text-sm font-medium text-[#e9e7df]">{f.t}</div><div className="mt-0.5 text-xs text-[#8a8577]">{f.d}</div></div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdf]"><AlertTriangle className="h-4 w-4 text-[#d4af37]" /> Security tips</h3>
          <ul className="space-y-3 text-sm text-[#c9c4b4]">
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> Enable the authenticator app — it protects you even if your password is stolen.</li>
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> Add Face ID to sign in with your face or fingerprint instantly.</li>
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> Keep login notifications on to catch unusual sign-ins.</li>
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> Never share verification codes — we will never ask for them.</li>
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 flex items-center justify-between gap-2 font-semibold text-[#f0ecdd]">
            <span className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-[#d4af37]" /> Face ID / passkeys</span>
            <button onClick={addPasskey} disabled={pkBusy || !passkeySupported || pkLoading} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#d4af37] px-4 text-sm font-semibold text-black transition hover:bg-[#e3c24f] disabled:cursor-not-allowed disabled:opacity-60"><Plus className="h-4 w-4" /> Add</button>
          </h3>
          {!passkeySupported && <p className="rounded-xl bg-red-400/10 p-3 text-xs text-red-300">This device or browser does not support passkeys. Use a recent version of Chrome, Safari, Edge or Firefox.</p>}
          {pkLoading ? <p className="text-sm text-[#8a8577]">Loading…</p> : passkeys.length === 0 ? (
            <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-[#8a8577]">No Face ID / passkeys yet. Add one to sign in with your face or fingerprint instead of a code.</p>
          ) : (
            <div className="space-y-2">
              {passkeys.map((p) => (
                <div key={p.credId} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div><div className="text-sm font-medium text-[#e9e7df]">{p.label || 'Face ID / Passkey'}</div><div className="text-xs text-[#8a8577]">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</div></div>
                  </div>
                  <button onClick={() => deletePasskey(p.credId)} className="flex min-h-[44px] w-10 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Monitor className="h-4 w-4 text-[#d4af37]" /> Login notifications</h3>
          <p className="text-sm text-[#8a8577]">Receive an email whenever a new device signs in to your account, with device, IP and time so you spot suspicious activity fast.</p>
          <div className="mt-4 space-y-2">
            {[{ mode: 'email', t: 'Email me on every new sign-in', d: 'Recommended — works on any device' }, { mode: 'off', t: 'Off', d: 'No sign-in emails' }].map((opt) => (
              <label key={opt.mode} className={`flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${notifyMode === opt.mode ? 'border-[#d4af37]/50 bg-[#d4af37]/[0.07]' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
                <div><div className="text-sm font-medium text-[#e9e7df]">{opt.t}</div><div className="text-xs text-[#8a8577]">{opt.d}</div></div>
                <input type="radio" name="loginNotifications" className="h-4 w-4 accent-[#d4af37]" checked={notifyMode === opt.mode} disabled={notifyBusy} onChange={() => toggleNotifications(opt.mode)} />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 glass rounded-2xl p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Monitor className="h-4 w-4 text-[#d4af37]" /> Active sessions</h3>
        <p className="text-sm text-[#8a8577]">Sign-in history is recorded for every login. You can review the most recent events below.</p>
        <div className="mt-4 rounded-xl bg-white/[0.03] p-4 text-sm text-[#8a8577]">
          Recent sign-ins appear here grouped by device — new logins are tracked automatically from your next sign-in.
        </div>
      </div>
    </AppLayout>
  );
}

function FieldRow({ label, value, onChange, busy, buttonLabel, disabled }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-xs text-[#8a8577]">{label}</label>
        <input value={value} onChange={(e) => onChange(normalizeCode(e.target.value))} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="min-h-[44px] w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/50" />
      </div>
      <button disabled={busy || disabled} className="min-h-[44px] rounded-lg bg-[#d4af37] px-5 text-sm font-semibold text-black transition hover:bg-[#e3c24f] disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Please wait…' : buttonLabel}</button>
    </div>
  );
}