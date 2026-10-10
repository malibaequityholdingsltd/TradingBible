import React, { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Loader2, CalendarClock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, GoldButton, GhostButton, EmptyState } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TbcMoney } from '@/components/TbcSign';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 min-h-[44px]';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

export default function MentorsPage() {
  const { toast } = useToast();
  const [mentors, setMentors] = useState([]);
  const [sessions, setSessions] = useState({ mine: [], teaching: [] });
  const [form, setForm] = useState({ headline: '', topics: '', price: '99' });
  const [book, setBook] = useState({ mentor: '', topic: '' });
  const [busy, setBusy] = useState('');
  const [tbcPerUsd, setTbcPerUsd] = useState(1 / 3.25);
  const tbcFor = (usd) => Math.round(Number(usd || 0) * tbcPerUsd * 100) / 100;

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([
        fetch(`${API_SERVER_URL}/market/mentors`).then((r) => r.json()).catch(() => ({})),
        pb.authStore.token
          ? fetch(`${API_SERVER_URL}/market/mentors/sessions`, { headers: headers() }).then((r) => r.json()).catch(() => ({}))
          : {},
      ]);
      setMentors(m.mentors || []);
      setSessions({ mine: s.mine || [], teaching: s.teaching || [] });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch(`${API_SERVER_URL}/tbc/econ`).then((r) => r.json()).then((e) => {
      const rt = Number(e?.tbcPerUsd);
      if (rt > 0.15 && rt < 0.6) setTbcPerUsd(rt); // 1 TBC = 1 KWD — reject 1:1
      else if (Number(e?.usdPerKwd) >= 2 && Number(e?.usdPerKwd) <= 5) setTbcPerUsd(1 / Number(e.usdPerKwd));
    }).catch(() => {});
  }, []);

  const register = async () => {
    if (!form.headline.trim() || !(Number(form.price) > 0)) { toast({ variant: 'destructive', title: 'Headline + hourly price required' }); return; }
    setBusy('reg');
    try {
      const res = await fetch(`${API_SERVER_URL}/market/mentors/register`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ headline: form.headline.trim(), topics: form.topics.split(',').map((t) => t.trim()).filter(Boolean), price: Number(form.price) }),
      });
      if (!res.ok) throw new Error('registration failed');
      toast({ title: 'Mentor profile live', description: 'Students can now book you.' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Registration failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const completeSession = async (id) => {
    setBusy(`done:${id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/market/mentors/complete`, { method: 'POST', headers: headers(), body: JSON.stringify({ sessionId: id }) });
      if (!res.ok) throw new Error('failed');
      toast({ title: 'Session marked complete' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Update failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const bookSession = async (mentor, price) => {
    const topic = window.prompt(`What should the session with ${mentor} cover?`, book.topic || 'Trade review') || '';
    if (!topic) return;
    if (!window.confirm(`Book for ${tbcFor(price).toLocaleString()} TBC ($${price} list)? Paid in TBC from your till now.`)) return;
    setBusy(`book:${mentor}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/market/mentors/book`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ mentor, topic: topic.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'booking failed');
      toast({ title: 'Session booked', description: 'Coordinate timing via community DMs.' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Booking failed', description: e.message }); }
    finally { setBusy(''); }
  };

  return (
    <AppLayout title="Mentors">
      <div className="tb-page">
        <PageHero
          kickerIcon={GraduationCap}
          kicker="Mentorship"
          title="Learn 1-on-1 from"
          accent="verified traders"
          subtitle="Book hourly sessions with profitable members. Mentors keep 85%, paid from your wallet."
        />
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-[#f0ecdd]">Become a mentor</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input className={input} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Headline — e.g. Ex-funded scalper, 5y" />
            <input className={input} value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} placeholder="Topics, comma separated" />
            <div className="flex gap-2">
              <input className={input} type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="$/hour" />
              <GoldButton disabled={busy === 'reg'} onClick={register} className="!px-4 !py-2 !text-xs">{busy === 'reg' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}</GoldButton>
            </div>
          </div>
        </Card>

        {mentors.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No mentors yet" sub="Publish your profile above to be the first." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mentors.map((m) => (
              <Card key={m.owner} className="p-5">
                <div className="font-semibold text-[#f0ecdd]">{m.name}</div>
                <div className="text-sm text-[#c9c4b4]">{m.headline}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(m.topics || []).map((t) => <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-[#8a8577]">{t}</span>)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[#d4af37]"><TbcMoney amount={tbcFor(m.price)} /><span className="ml-1 font-mono text-[11px] text-[#8a8577]">/hr (${m.price})</span></span>
                  <GhostButton disabled={busy === `book:${m.owner}`} onClick={() => bookSession(m.owner, m.price)} className="!px-3 !py-1.5 !text-xs">
                    {busy === `book:${m.owner}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Book session'}
                  </GhostButton>
                </div>
              </Card>
            ))}
          </div>
        )}

        {(sessions.mine.length > 0 || sessions.teaching.length > 0) && (
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f0ecdd]"><CalendarClock className="h-4 w-4 text-[#d4af37]" /> Sessions</h3>
            <div className="mt-3 space-y-2 text-sm">
              {sessions.mine.map((s) => (
                <div key={s.id} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                  <span className="text-[#c9c4b4]">Learning: {s.topic || 'general'} · ${s.price_usd}</span>
                  <span className="text-xs text-[#8a8577]">{s.status}</span>
                </div>
              ))}
              {sessions.teaching.map((s) => (
                <div key={s.id} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                  <span className="text-[#c9c4b4]">Teaching: {s.topic || 'general'} · +${Math.round((s.price_usd - s.platform_fee) * 100) / 100}</span>
                  <span className="text-xs text-[#8a8577]">{s.status}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
