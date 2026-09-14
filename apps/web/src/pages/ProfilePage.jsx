import React, { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, Crown, Check, Camera, Trash2, KeyRound } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { avatarUrl } from '@/lib/avatar';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
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
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    primaryMarket: user?.primaryMarket || 'Forex',
    experience: user?.experience || 'Intermediate',
    goal: user?.goal || 'Discipline',
  });
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
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

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = { username: form.username, phone: form.phone, primaryMarket: form.primaryMarket, experience: form.experience, goal: form.goal, name: form.username };
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
        await updateProfile({
          username: form.username,
          phone: form.phone,
          primaryMarket: form.primaryMarket,
          experience: form.experience,
          goal: form.goal,
          name: form.username,
        });
        setAutosaveState('saved');
      } catch (err) {
        setAutosaveState('error');
        toast({ variant: 'destructive', title: t('prof.autoFail'), description: err?.message || t('prof.autoFailDesc') });
      }
    }, 750);
    return () => clearTimeout(timer);
  }, [form.username, form.phone, form.primaryMarket, form.experience, form.goal, updateProfile, toast]);

  const Select = ({ value, onChange, options }) => (
    <select value={value} onChange={onChange} className={input}>{options.map((o) => <option key={o} className="bg-[#0f0f14]">{o}</option>)}</select>
  );

  return (
    <AppLayout title={t('nav.profile')}>
      <div className="mb-5">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#8a8577]">{t('prof.balances')}</h3>
        <AccountBalances />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={saveProfile} className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="mb-5 font-semibold text-[#f0ecdd]">{t('prof.details')}</h3>
          <div className="mb-4 text-xs text-[#8a8577]">
            {autosaveState === 'saving' && t('prof.saving')}
            {autosaveState === 'saved' && t('prof.saved')}
            {autosaveState === 'error' && t('prof.saveErr')}
            {autosaveState === 'idle' && t('prof.idleSave')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Row icon={User} label={t('auth.username')}><input className={input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder={t('prof.yourName')} /></Row>
            <Row icon={Mail} label={t('auth.emailAddress')}><input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Row>
            <Row icon={Phone} label={t('auth.phone')}><input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('prof.phonePh')} /></Row>
            <Row icon={Crown} label={t('auth.primaryMarket')}><Select value={form.primaryMarket} onChange={(e) => setForm({ ...form, primaryMarket: e.target.value })} options={MARKETS} /></Row>
            <Row icon={Crown} label={t('auth.experience')}><Select value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} options={EXPERIENCE} /></Row>
            <Row icon={Crown} label={t('auth.mainGoal')}><Select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} options={GOALS} /></Row>
          </div>
          <button disabled={busy} className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60"><Check className="h-4 w-4" /> {t('c.save')}</button>
        </form>

        <div className="space-y-5">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-lg font-bold text-[#0a0a0f]">{avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : (form.username || form.email || 'A').charAt(0).toUpperCase()}</div>
                <button type="button" disabled={avatarBusy} onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-[#0a0a0f] bg-[#d4af37] text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60" title={t('prof.changePic')}><Camera className="h-3.5 w-3.5" /></button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { uploadAvatar(e.target.files?.[0]); e.target.value = ''; }} />
              </div>
              <div className="min-w-0"><div className="font-semibold text-[#f0ecdd]">{form.username || t('prof.trader')}</div><div className="truncate text-xs text-[#8a8577]">{form.email}</div>{avatar && <button type="button" onClick={removeAvatar} disabled={avatarBusy} className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#8a8577] transition hover:text-red-400"><Trash2 className="h-3 w-3" /> {t('prof.removePhoto')}</button>}</div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#d4af37]/8 px-3 py-2 text-sm text-[#d4af37]"><Crown className="h-4 w-4" /> {(user?.plan || 'trial').charAt(0).toUpperCase() + (user?.plan || 'trial').slice(1)} plan</div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><KeyRound className="h-4 w-4 text-[#d4af37]" /> {t('prof.pwdless')}</h3>
            <p className="text-sm text-[#8a8577]">{t('prof.pwdlessBody')}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
