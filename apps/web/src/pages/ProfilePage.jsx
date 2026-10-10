import React, { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, Crown, Check, Camera, Trash2, KeyRound, CalendarDays, MapPin } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, GoldButton, SectionHead } from '@/components/ui-kit';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { avatarUrl } from '@/lib/avatar';
import { displayName, displayInitial } from '@/lib/displayName';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { useWallet } from '@/hooks/useWallet';
import { MARKETS, EXPERIENCE, GOALS } from '@/lib/mockData';
import AccountBalances from '@/components/AccountBalances';

const Row = ({ icon: Icon, label, children }) => (
  <div>
    <label className="mb-1.5 flex items-center gap-2 text-sm text-[#c9c4b4]"><Icon className="h-3.5 w-3.5 text-[#8a8577]" />{label}</label>
    {children}
  </div>
);
const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { rails } = useWallet();
  // After KYC verification NOTHING on the account may change — the verified
  // record is the payout identity. All fields lock, not just name/DOB.
  const kycVerified = rails?.kyc?.status === 'verified';
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstName: user?.first_name ?? user?.firstName ?? '',
    lastName: user?.last_name ?? user?.lastName ?? '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: user?.dob || '',
    address: user?.address || '',
    primaryMarket: user?.primaryMarket || 'Forex',
    experience: user?.experience || 'Intermediate',
    goal: user?.goal || 'Discipline',
  });
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  // KYC identity lock: once first + last name + date of birth are saved,
  // they must match the government-issued ID used for verification and can
  // never be edited here again — a mistake means opening a new account.
  const identityLocked = Boolean(
    String(user?.first_name || '').trim()
    && String(user?.last_name || '').trim()
    && (user?.dob || ''),
  );
  const [autosaveState, setAutosaveState] = useState('idle');
  const fileRef = useRef(null);
  const firstRun = useRef(true);
  const avatar = avatarUrl(user);

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast({ variant: 'destructive', title: t('prof.invalidFile'), description: t('prof.chooseImage') });
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await updateProfile(fd);
      toast({ title: t('prof.picUpdated') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('prof.uploadFail'), description: err?.message || t('c.retry') });
    } finally { setAvatarBusy(false); }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      await updateProfile({ avatar: null });
      toast({ title: t('prof.picRemoved') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('prof.removeFail'), description: err?.message || t('c.retry') });
    } finally { setAvatarBusy(false); }
  };

  const identityOf = (f) => {
    const first = String(f.firstName || '').trim();
    const last = String(f.lastName || '').trim();
    return {
      first_name: first,
      last_name: last,
      name: `${first} ${last}`.trim(),
      phone: String(f.phone || '').trim(),
      dob: f.dob || null,
      address: String(f.address || '').trim(),
      primaryMarket: f.primaryMarket,
      experience: f.experience,
      goal: f.goal,
    };
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (kycVerified) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ variant: 'destructive', title: t('auth.firstName', null, 'First name'), description: t('auth.nameRequired', null, 'Please enter your first and last name.') });
      return;
    }
    if (!form.phone.trim()) {
      toast({ variant: 'destructive', title: t('auth.phone', null, 'Phone'), description: t('auth.phoneRequired', null, 'A valid phone number is required.') });
      return;
    }
    if (!form.dob) {
      toast({ variant: 'destructive', title: t('auth.dob', null, 'Date of birth'), description: t('auth.dobRequired', null, 'Your date of birth is required.') });
      return;
    }
    setBusy(true);
    try {
      const data = identityOf(form);
      if (form.email && form.email !== user?.email) {
        await pb.collection('users').requestEmailChange(form.email);
        toast({ title: t('prof.emailReq'), description: t('prof.emailReqDesc') });
      }
      await updateProfile(data);
      toast({ title: t('prof.savedT'), description: t('prof.savedDesc') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('prof.saveFail'), description: err?.message || t('c.retry') });
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setAutosaveState('saving');
      try {
        await updateProfile(identityOf(form));
        setAutosaveState('saved');
      } catch (err) {
        setAutosaveState('error');
        toast({ variant: 'destructive', title: t('prof.autoFail'), description: err?.message || t('prof.autoFailDesc') });
      }
    }, 750);
    return () => clearTimeout(timer);
  }, [form.firstName, form.lastName, form.phone, form.dob, form.address, form.primaryMarket, form.experience, form.goal, updateProfile, toast]);

  const Select = ({ value, onChange, options }) => (
    <select value={value} onChange={onChange} className={input}>{options.map((o) => <option key={o} className="bg-[#0f0f14]">{o}</option>)}</select>
  );

  return (
    <AppLayout title={t('nav.profile')}>
      <div className="tb-page">
      <div className="mb-1">
        <SectionHead title={t('prof.balances')} />
        <AccountBalances />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <form onSubmit={saveProfile} className="tb-card lg:col-span-2">
          <SectionHead title={t('prof.details')} />
          {kycVerified ? (
            <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] p-3 text-xs leading-relaxed text-[#c9c4b4]">
              <span className="font-bold text-emerald-400">Verified — account details locked.</span>{' '}
              Your identity is verified for KYC and payouts, so no account details can be updated anymore.
            </div>
          ) : identityLocked ? (
            <div className="mb-4 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/[0.07] p-3 text-xs leading-relaxed text-[#c9c4b4]">
              <span className="font-bold text-[#d4af37]">Identity locked for KYC verification.</span>{' '}
              Your name and date of birth match your government-issued ID and cannot be changed here.
              If they were entered incorrectly, you will need to open a new account.
            </div>
          ) : (
            <div className="mb-4 rounded-xl border border-red-400/25 bg-red-400/[0.05] p-3 text-xs leading-relaxed text-[#c9c4b4]">
              <span className="font-bold text-red-400">Enter your real government identity.</span>{' '}
              First name, last name and date of birth must exactly match your government-issued ID —
              they are used for KYC verification and <span className="font-bold">cannot be changed after saving</span>.
              Any mistake means opening a new account, so check carefully before saving.
            </div>
          )}
          <div className="mb-4 text-xs text-[#8a8577]">
            {autosaveState === 'saving' && t('prof.saving')}
            {autosaveState === 'saved' && t('prof.saved')}
            {autosaveState === 'error' && t('prof.saveErr')}
            {autosaveState === 'idle' && t('prof.idleSave')}
          </div>
          <fieldset disabled={kycVerified} className="min-w-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Row icon={User} label={`${t('auth.firstName', null, 'First name')} *`}><input className={input} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder={t('auth.firstName', null, 'First name')} autoComplete="given-name" disabled={identityLocked} /></Row>
            <Row icon={User} label={`${t('auth.lastName', null, 'Last name')} *`}><input className={input} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder={t('auth.lastName', null, 'Last name')} autoComplete="family-name" disabled={identityLocked} /></Row>
            <Row icon={Mail} label={t('auth.emailAddress')}><input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Row>
            <Row icon={Phone} label={`${t('auth.phone', null, 'Phone')} *`}><input className={input} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('prof.phonePh')} autoComplete="tel" /></Row>
            <Row icon={CalendarDays} label={`${t('auth.dob', null, 'Date of birth')} *`}><input className={input} type="date" value={form.dob || ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} max={new Date().toISOString().slice(0, 10)} disabled={identityLocked} /></Row>
            <div className="sm:col-span-2">
              <Row icon={MapPin} label={t('prof.address', null, 'Residential address')}>
                <input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('prof.addressPh', null, 'Street, city, country — as on your ID')} autoComplete="street-address" />
              </Row>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#6a665a]">Only compulsory for withdrawals and identity (KYC) verification — otherwise optional.</p>
            </div>
            <Row icon={Crown} label={t('auth.primaryMarket')}><Select value={form.primaryMarket} onChange={(e) => setForm({ ...form, primaryMarket: e.target.value })} options={MARKETS} /></Row>
            <Row icon={Crown} label={t('auth.experience')}><Select value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} options={EXPERIENCE} /></Row>
            <Row icon={Crown} label={t('auth.mainGoal')}><Select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} options={GOALS} /></Row>
          </div>
          <GoldButton disabled={busy || kycVerified} className="mt-5"><Check className="h-4 w-4" /> {t('c.save')}</GoldButton>
          </fieldset>
        </form>

        <div className="space-y-4 sm:space-y-5">
          <Card>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-lg font-bold text-[#0a0a0f]">{avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : displayInitial({ ...user, ...form })}</div>
                <button type="button" disabled={avatarBusy} onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-[#0a0a0f] bg-[#d4af37] text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60" title={t('prof.changePic')}><Camera className="h-3.5 w-3.5" /></button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { uploadAvatar(e.target.files?.[0]); e.target.value = ''; }} />
              </div>
              <div className="min-w-0"><div className="font-semibold text-[#f0ecdd]">{displayName({ ...user, ...form })}</div><div className="truncate text-xs text-[#8a8577]">{form.email}</div>{avatar && <button type="button" onClick={removeAvatar} disabled={avatarBusy} className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#8a8577] transition hover:text-red-400"><Trash2 className="h-3 w-3" /> {t('prof.removePhoto')}</button>}</div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#d4af37]/8 px-3 py-2 text-sm text-[#d4af37]"><Crown className="h-4 w-4" /> {user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : t('bill.noPlan', null, 'No plan')} {user?.plan ? 'plan' : ''}</div>
          </Card>

          <Card>
            <SectionHead icon={KeyRound} title={t('prof.pwdless')} />
            <p className="text-sm text-[#8a8577]">{t('prof.pwdlessBody')}</p>
          </Card>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
