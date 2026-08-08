import React, { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, Crown, Check, Camera, Trash2, KeyRound } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
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
    if (!file.type.startsWith('image/')) return toast({ variant: 'destructive', title: 'Invalid file', description: 'Please choose an image.' });
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await updateProfile(fd);
      toast({ title: 'Profile picture updated' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err?.message || 'Please try again.' });
    } finally { setAvatarBusy(false); }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      await updateProfile({ avatar: null });
      toast({ title: 'Profile picture removed' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Remove failed', description: err?.message || 'Please try again.' });
    } finally { setAvatarBusy(false); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = { username: form.username, phone: form.phone, primaryMarket: form.primaryMarket, experience: form.experience, goal: form.goal, name: form.username };
      if (form.email && form.email !== user?.email) {
        await pb.collection('users').requestEmailChange(form.email);
        toast({ title: 'Email change requested', description: 'Confirm via the link sent to your new address.' });
      }
      await updateProfile(data);
      toast({ title: 'Profile saved', description: 'Your details have been updated.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: err?.message || 'Please try again.' });
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
        toast({ variant: 'destructive', title: 'Autosave failed', description: err?.message || 'Please try saving manually.' });
      }
    }, 750);
    return () => clearTimeout(timer);
  }, [form.username, form.phone, form.primaryMarket, form.experience, form.goal, updateProfile, toast]);

  const Select = ({ value, onChange, options }) => (
    <select value={value} onChange={onChange} className={input}>{options.map((o) => <option key={o} className="bg-[#0f0f14]">{o}</option>)}</select>
  );

  return (
    <AppLayout title="Profile">
      <div className="mb-5">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#8a8577]">Account balances</h3>
        <AccountBalances />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={saveProfile} className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="mb-5 font-semibold text-[#f0ecdd]">Account details</h3>
          <div className="mb-4 text-xs text-[#8a8577]">
            {autosaveState === 'saving' && 'Saving changes...'}
            {autosaveState === 'saved' && 'Changes saved automatically'}
            {autosaveState === 'error' && 'Autosave failed, use Save changes'}
            {autosaveState === 'idle' && 'Changes save automatically as you edit'}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Row icon={User} label="Username"><input className={input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Your name" /></Row>
            <Row icon={Mail} label="Email address"><input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Row>
            <Row icon={Phone} label="Phone number"><input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" /></Row>
            <Row icon={Crown} label="Primary market"><Select value={form.primaryMarket} onChange={(e) => setForm({ ...form, primaryMarket: e.target.value })} options={MARKETS} /></Row>
            <Row icon={Crown} label="Experience"><Select value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} options={EXPERIENCE} /></Row>
            <Row icon={Crown} label="Main goal"><Select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} options={GOALS} /></Row>
          </div>
          <button disabled={busy} className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60"><Check className="h-4 w-4" /> Save changes</button>
        </form>

        <div className="space-y-5">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-lg font-bold text-[#0a0a0f]">{avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : (form.username || form.email || 'A').charAt(0).toUpperCase()}</div>
                <button type="button" disabled={avatarBusy} onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-[#0a0a0f] bg-[#d4af37] text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60" title="Change picture"><Camera className="h-3.5 w-3.5" /></button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { uploadAvatar(e.target.files?.[0]); e.target.value = ''; }} />
              </div>
              <div className="min-w-0"><div className="font-semibold text-[#f0ecdd]">{form.username || 'Trader'}</div><div className="truncate text-xs text-[#8a8577]">{form.email}</div>{avatar && <button type="button" onClick={removeAvatar} disabled={avatarBusy} className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#8a8577] transition hover:text-red-400"><Trash2 className="h-3 w-3" /> Remove photo</button>}</div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#d4af37]/8 px-3 py-2 text-sm text-[#d4af37]"><Crown className="h-4 w-4" /> {(user?.plan || 'trial').charAt(0).toUpperCase() + (user?.plan || 'trial').slice(1)} plan</div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><KeyRound className="h-4 w-4 text-[#d4af37]" /> Passwordless login</h3>
            <p className="text-sm text-[#8a8577]">Your account supports one-time verification codes by email, and password sign-in as a backup.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
