import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Lock, ShieldCheck, Smartphone, KeyRound, Monitor, AlertTriangle, Plus, Trash2, Fingerprint, CheckCircle2, Power, XCircle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { totpStatus, totpSetup, totpEnable, totpDisable, registerPasskey, passkeyStatus, removePasskey, accountDeactivate, accountReactivate, accountClose } from '@/lib/security';

function normalizeCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

export default function SecurityPage() {
  const { user, updateProfile, logout } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Account lifecycle (deactivate / close)
  const [accountBusy, setAccountBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

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
      toast({ variant: 'destructive', title: t('sec.setupFail'), description: String(err?.message || t('c.retry')) });
    } finally { setTotpBusy(false); }
  };

  const confirmTotp = async (e) => {
    e.preventDefault();
    const code = normalizeCode(totpCode);
    if (code.length !== 6) {
      toast({ variant: 'destructive', title: t('auth.e.enter6'), description: t('auth.e.totpDesc') });
      return;
    }
    setTotpBusy(true);
    try {
      await totpEnable(code);
      setTotpEnabled(true);
      setSetupSecret('');
      setQrDataUrl('');
      setTotpCode('');
      toast({ title: t('sec.enabledT'), description: t('sec.enabledDesc') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sec.rejected'), description: String(err?.message || t('sec.checkCode')) });
    } finally { setTotpBusy(false); }
  };

  const disableTotp = async (e) => {
    e.preventDefault();
    const code = normalizeCode(totpCode);
    if (code.length !== 6) {
      toast({ variant: 'destructive', title: t('auth.e.enter6'), description: t('sec.enterDisable') });
      return;
    }
    setTotpBusy(true);
    try {
      await totpDisable(code);
      setTotpEnabled(false);
      setTotpCode('');
      toast({ title: t('sec.disabledT'), description: t('sec.disabledDesc') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sec.rejected'), description: String(err?.message || t('sec.checkCode')) });
    } finally { setTotpBusy(false); }
  };

  const addPasskey = async () => {
    setPkBusy(true);
    try {
      await registerPasskey();
      const pStatus = await passkeyStatus();
      setPasskeys(pStatus?.passkeys || []);
      toast({ title: t('sec.pkAdded'), description: t('sec.pkAddedDesc') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sec.pkAddFail'), description: String(err?.message || t('c.retry')) });
    } finally { setPkBusy(false); }
  };

  const deletePasskey = async (credId) => {
    try {
      await removePasskey(credId);
      setPasskeys((prev) => prev.filter((p) => p.credId !== credId));
      toast({ title: t('sec.pkRemoved'), description: t('sec.pkRemovedDesc') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sec.pkRemoveFail'), description: String(err?.message || t('c.retry')) });
    }
  };

  const toggleNotifications = async (mode) => {
    setNotifyBusy(true);
    try {
      const merged = { ...(user?.user_settings || {}), loginNotifications: mode === 'off' ? false : true };
      await updateProfile({ user_settings: merged });
      setNotifyMode(mode);
      toast({ title: mode === 'off' ? t('sec.notifOff') : t('sec.notifOn'), description: mode === 'off' ? t('sec.notifOffDesc') : t('sec.notifOnDesc') });
    } catch {
      toast({ variant: 'destructive', title: t('sec.updateFail'), description: t('c.retry') });
    } finally { setNotifyBusy(false); }
  };

  const deactivateAccount = async () => {
    setAccountBusy(true);
    try {
      await accountDeactivate();
      await logout();
      toast({ title: t('sec.deactivated'), description: t('sec.deactivatedDesc') });
      navigate('/');
    } catch (err) {
      toast({ variant: 'destructive', title: t('sec.deactivateFail'), description: String(err?.message || t('c.retry')) });
    } finally { setAccountBusy(false); }
  };

  const reactivateAccount = async () => {
    setAccountBusy(true);
    try {
      await accountReactivate();
      toast({ title: t('sec.reactivated'), description: t('sec.reactivatedDesc') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sec.reactivateFail'), description: String(err?.message || t('c.retry')) });
    } finally { setAccountBusy(false); }
  };

  const closeAccount = async () => {
    setAccountBusy(true);
    try {
      await accountClose();
      await logout();
      toast({ title: t('sec.closedAcc'), description: t('sec.closedAccDesc') });
      navigate('/');
    } catch (err) {
      toast({ variant: 'destructive', title: t('sec.closeFail'), description: String(err?.message || t('c.retry')) });
    } finally { setAccountBusy(false); }
  };

  return (
    <AppLayout title={t('nav.security')}>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${totpEnabled ? 'bg-emerald-400/12 text-emerald-400' : 'bg-[#d4af37]/12 text-[#d4af37]'}`}><ShieldCheck className="h-6 w-6" /></div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#f0ecdd]">{t('sec.totp')}</h3>
                {!setupSecret && <button
                  onClick={totpEnabled ? () => beginTotpSetup() : beginTotpSetup}
                  disabled={totpLoading || totpBusy}
                  className="min-h-[44px] rounded-lg bg-[#d4af37] px-4 text-sm font-semibold text-black transition hover:bg-[#e3c24f] disabled:opacity-60"
                >{totpLoading ? t('c.loading') : (totpEnabled ? t('sec.changeSecret') : t('sec.enable'))}</button>}
              </div>
              <p className="mt-1 text-sm text-[#8a8577]">{t('sec.totpBody')}</p>
              <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${totpEnabled ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#d4af37]/10 text-[#d4af37]'}`}>
                <span className={`h-2 w-2 rounded-full ${totpEnabled ? 'bg-emerald-400' : 'bg-[#d4af37]'}`} /> {totpEnabled ? t('sec.active') : t('sec.inactive')}
              </div>
            </div>
          </div>

          {setupSecret && !totpEnabled && (
            <form onSubmit={confirmTotp} className="mt-6 grid gap-4 rounded-2xl border border-[#d4af37]/20 bg-black/20 p-5 sm:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center justify-center gap-2">
                {qrDataUrl ? <img src={qrDataUrl} alt={t('sec.scanWith')} className="h-40 w-40 rounded-xl bg-transparent" /> : <div className="h-40 w-40 animate-pulse rounded-xl bg-white/10" />}
                <span className="text-[11px] text-[#8a8577]">{t('sec.scanWith')}</span>
              </div>
              <div className="flex flex-col justify-center gap-3">
                <p className="text-sm text-[#c9c4b4]">{t('sec.cantScan')}</p>
                <code className="select-all rounded-lg bg-white/[0.06] px-3 py-2 text-xs tracking-widest text-[#d4af37]">{setupSecret.replace(/(.{4})/g, '$1 ').trim()}</code>
                <FieldRow label={t('sec.currentCode')} value={totpCode} onChange={setTotpCode} busy={totpBusy} buttonLabel={t('sec.verifyEnable')} disabled={!totpCode} t={t} />
              </div>
            </form>
          )}

          {totpEnabled && !setupSecret && (
            <form onSubmit={disableTotp} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-xs text-[#8a8577]">{t('sec.enterDisable')}</label>
                <input value={totpCode} onChange={(e) => setTotpCode(normalizeCode(e.target.value))} inputMode="numeric" maxLength={6} placeholder={t('sec.codePh')} className="min-h-[44px] w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/50" />
              </div>
              <button disabled={totpBusy || normalizeCode(totpCode).length !== 6} className="min-h-[44px] self-end rounded-lg border border-red-400/40 px-4 text-sm font-semibold text-red-400 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50">{t('sec.disable2fa')}</button>
            </form>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Smartphone, tk: 'sec.f1t', dk: 'sec.f1b' },
              { icon: KeyRound, tk: 'sec.f2t', dk: 'sec.f2b' },
              { icon: Lock, tk: 'sec.f3t', dk: 'sec.f3b' },
            ].map((f) => (
              <div key={f.tk} className="rounded-xl bg-white/[0.03] p-4"><f.icon className="h-5 w-5 text-[#d4af37]" /><div className="mt-2 text-sm font-medium text-[#e9e7df]">{t(f.tk)}</div><div className="mt-0.5 text-xs text-[#8a8577]">{t(f.dk)}</div></div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdf]"><AlertTriangle className="h-4 w-4 text-[#d4af37]" /> {t('sec.tips')}</h3>
          <ul className="space-y-3 text-sm text-[#c9c4b4]">
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> {t('sec.tip1')}</li>
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> {t('sec.tip2')}</li>
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> {t('sec.tip3')}</li>
            <li className="flex gap-2"><span className="text-[#d4af37]">•</span> {t('sec.tip4')}</li>
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 flex items-center justify-between gap-2 font-semibold text-[#f0ecdd]">
            <span className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-[#d4af37]" /> {t('sec.faceId')}</span>
            <button onClick={addPasskey} disabled={pkBusy || !passkeySupported || pkLoading} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#d4af37] px-4 text-sm font-semibold text-black transition hover:bg-[#e3c24f] disabled:cursor-not-allowed disabled:opacity-60"><Plus className="h-4 w-4" /> {t('sec.add')}</button>
          </h3>
          {!passkeySupported && <p className="rounded-xl bg-red-400/10 p-3 text-xs text-red-300">{t('sec.noPkSupport')}</p>}
          {pkLoading ? <p className="text-sm text-[#8a8577]">{t('c.loading')}</p> : passkeys.length === 0 ? (
            <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-[#8a8577]">{t('sec.noPk')}</p>
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
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Monitor className="h-4 w-4 text-[#d4af37]" /> {t('sec.loginNotif')}</h3>
          <p className="text-sm text-[#8a8577]">{t('sec.loginNotifBody')}</p>
          <div className="mt-4 space-y-2">
            {[{ mode: 'email', tk: 'sec.emailEvery', dk: 'sec.emailEveryDesc' }, { mode: 'off', tk: 'sec.offNotif', dk: 'sec.offDesc' }].map((opt) => (
              <label key={opt.mode} className={`flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${notifyMode === opt.mode ? 'border-[#d4af37]/50 bg-[#d4af37]/[0.07]' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
                <div><div className="text-sm font-medium text-[#e9e7df]">{t(opt.tk)}</div><div className="text-xs text-[#8a8577]">{t(opt.dk)}</div></div>
                <input type="radio" name="loginNotifications" className="h-4 w-4 accent-[#d4af37]" checked={notifyMode === opt.mode} disabled={notifyBusy} onChange={() => toggleNotifications(opt.mode)} />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 glass rounded-2xl p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Monitor className="h-4 w-4 text-[#d4af37]" /> {t('sec.sessions')}</h3>
          <p className="text-sm text-[#8a8577]">{t('sec.sessionsBody')}</p>
          <div className="mt-4 rounded-xl bg-white/[0.03] p-4 text-sm text-[#8a8577]">
            {t('sec.sessionsNote')}
          </div>
      </div>

      <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/[0.05] p-6">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-red-300"><AlertTriangle className="h-4 w-4" /> {t('sec.danger')}</h3>
        <p className="text-sm text-[#8a8577]">{t('sec.dangerBody')}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 font-medium text-[#e9e7df]"><Power className="h-4 w-4 text-[#d4af37]" /> {t('sec.deactivate')}</div>
            <p className="mt-1 text-xs text-[#8a8577]">{t('sec.deactivateBody')}</p>
            <button onClick={deactivateAccount} disabled={accountBusy} className="mt-3 min-h-[44px] rounded-lg border border-[#d4af37]/40 px-4 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:cursor-not-allowed disabled:opacity-50">{t('sec.deactivateBtn')}</button>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 font-medium text-[#e9e7df]"><XCircle className="h-4 w-4 text-red-400" /> {t('sec.close')}</div>
            <p className="mt-1 text-xs text-[#8a8577]">{t('sec.closeBody')}</p>
            {confirmClose ? (
              <div className="mt-3 flex items-center gap-2">
                <button onClick={closeAccount} disabled={accountBusy} className="min-h-[44px] rounded-lg bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50">{t('sec.confirmClose')}</button>
                <button onClick={() => setConfirmClose(false)} disabled={accountBusy} className="min-h-[44px] rounded-lg border border-white/10 px-4 text-sm text-[#8a8577] transition hover:bg-white/5">{t('c.cancel')}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClose(true)} disabled={accountBusy} className="mt-3 min-h-[44px] rounded-lg border border-red-400/40 px-4 text-sm font-semibold text-red-400 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50">{t('sec.close')}</button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function FieldRow({ label, value, onChange, busy, buttonLabel, disabled, t }) {
  const tt = t || ((k) => k);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-xs text-[#8a8577]">{label}</label>
        <input value={value} onChange={(e) => onChange(normalizeCode(e.target.value))} inputMode="numeric" maxLength={6} placeholder={tt('sec.codePh')} className="min-h-[44px] w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/50" />
      </div>
      <button disabled={busy || disabled} className="min-h-[44px] rounded-lg bg-[#d4af37] px-5 text-sm font-semibold text-black transition hover:bg-[#e3c24f] disabled:cursor-not-allowed disabled:opacity-60">{busy ? tt('auth.e.plsWait') : buttonLabel}</button>
    </div>
  );
}