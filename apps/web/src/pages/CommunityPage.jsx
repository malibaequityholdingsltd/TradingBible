import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Trophy, Plus, Send, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { avatarUrl } from '@/lib/avatar';

function Avatar({ src, letter, className = 'h-10 w-10 text-sm' }) {
  return (
    <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#d4af37]/12 font-bold text-[#d4af37] ${className}`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : (letter || 'T').charAt(0).toUpperCase()}
    </div>
  );
}

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50';
const CATS = ['General', 'Strategies', 'Psychology', 'Crypto', 'Forex', 'Stocks', 'Wins'];

function timeAgo(iso) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

function ThreadModal({ thread, onClose, onReplied }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [replies, setReplies] = useState([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await pb.collection('forum_replies').getFullList({ filter: `thread = "${thread.id}"`, sort: 'created' });
      setReplies(items);
    } catch { setReplies([]); }
  }, [thread.id]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await pb.collection('forum_replies').create({ body, thread: thread.id, owner: user.id, authorName: user.username || user.email, authorAvatar: avatarUrl(user) });
      await pb.collection('forum_threads').update(thread.id, { replyCount: (thread.replyCount || 0) + 1 }).catch(() => {});
      setBody(''); await load(); onReplied?.();
    } catch {
      toast({ variant: 'destructive', title: 'Could not post reply' });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[#d4af37]/20 bg-[#0c0c11] p-5 sm:rounded-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div><span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#d4af37]">{thread.category || 'General'}</span><h3 className="mt-2 text-lg font-semibold text-[#f0ecdd]">{thread.title}</h3></div>
          <button onClick={onClose} className="text-[#8a8577] hover:text-[#e9e7df]"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[#c9c4b4]">{thread.body}</p>
        <div className="mt-1 text-xs text-[#6a665a]">by {thread.authorName || 'trader'} · {timeAgo(thread.created)}</div>

        <div className="mt-5 space-y-3 border-t border-white/8 pt-4">
          {replies.length === 0 && <p className="text-sm text-[#8a8577]">No replies yet. Start the discussion.</p>}
          {replies.map((r) => (
            <div key={r.id} className="flex gap-3 rounded-xl bg-white/[0.03] p-3">
              <Avatar src={r.authorAvatar} letter={r.authorName} className="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-xs text-[#8a8577]"><span className="font-medium text-[#d4af37]">{r.authorName || 'trader'}</span> · {timeAgo(r.created)}</div>
                <p className="whitespace-pre-wrap text-sm text-[#e9e7df]">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input className={input} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" />
          <button disabled={busy} className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 text-sm font-semibold text-[#0a0a0f] disabled:opacity-60"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}

function Forum() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', category: 'General' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setThreads(await pb.collection('forum_threads').getFullList({ sort: '-created' })); }
    catch { setThreads([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setBusy(true);
    try {
      await pb.collection('forum_threads').create({ ...form, owner: user.id, authorName: user.username || user.email, authorAvatar: avatarUrl(user), replyCount: 0 });
      setForm({ title: '', body: '', category: 'General' }); setCreating(false); await load();
      toast({ title: 'Thread posted' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not post thread' });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        icon={MessageSquare}
        kicker="Community"
        description="Discuss strategy, psychology and markets with the community."
        actions={<button onClick={() => setCreating(!creating)} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f]"><Plus className="h-4 w-4" /> New thread</button>}
      />

      {creating && (
        <form onSubmit={create} className="mb-5 glass rounded-2xl p-5">
          <div className="grid gap-3">
            <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Thread title" />
            <textarea className={`${input} min-h-[90px] resize-y`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Share your thoughts…" />
            <div className="flex items-center gap-3">
              <select className={`${input} w-auto`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map((c) => <option key={c} className="bg-[#0f0f14]">{c}</option>)}</select>
              <button disabled={busy} className="rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] disabled:opacity-60">Post thread</button>
            </div>
          </div>
        </form>
      )}

      {loading ? <div className="glass rounded-2xl py-16 text-center text-sm text-[#8a8577]">Loading discussions…</div> : threads.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-14 text-center"><MessageSquare className="mx-auto mb-3 h-8 w-8 text-[#d4af37]" /><p className="text-sm text-[#8a8577]">No threads yet — be the first to start a discussion.</p></div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <button key={t.id} onClick={() => setActive(t)} className="glass glass-hover flex w-full items-center gap-4 rounded-2xl p-4 text-left">
              <Avatar src={t.authorAvatar} letter={t.authorName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#d4af37]">{t.category || 'General'}</span></div>
                <div className="mt-1 truncate font-medium text-[#f0ecdd]">{t.title}</div>
                <div className="truncate text-xs text-[#8a8577]">{t.authorName || 'trader'} · {timeAgo(t.created)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#d4af37]/15 bg-[#d4af37]/[0.06] px-2.5 py-1 text-xs text-[#c9c4b4]"><MessageSquare className="h-3.5 w-3.5 text-[#d4af37]" />{t.replyCount || 0}</div>
            </button>
          ))}
        </div>
      )}

      {active && <ThreadModal thread={active} onClose={() => { setActive(null); load(); }} onReplied={load} />}
    </div>
  );
}

// Real contributor leaderboard, ranked by actual forum activity. No synthetic
// traders or fabricated P&L — until members post, the board is empty.
function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [threads, replies] = await Promise.all([
          pb.collection('forum_threads').getFullList({ sort: '-created' }),
          pb.collection('forum_replies').getFullList({ sort: '-created' }),
        ]);
        const map = {};
        const bump = (name, avatar, key) => {
          if (!name) return;
          map[name] = map[name] || { name, avatar, threads: 0, replies: 0 };
          if (avatar && !map[name].avatar) map[name].avatar = avatar;
          map[name][key] += 1;
        };
        threads.forEach((t) => bump(t.authorName, t.authorAvatar, 'threads'));
        replies.forEach((r) => bump(r.authorName, r.authorAvatar, 'replies'));
        const list = Object.values(map)
          .map((m) => ({ ...m, contributions: m.threads + m.replies }))
          .sort((a, b) => b.contributions - a.contributions);
        setRows(list);
      } catch { setRows([]); } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="glass rounded-2xl py-16 text-center text-sm text-[#8a8577]">Loading leaderboard…</div>;
  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-14 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-[#d4af37]" />
        <p className="text-sm text-[#8a8577]">The leaderboard is empty. It ranks members by real community contributions — start posting to appear here.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-4 text-xs text-[#6a665a]">Ranked by community contributions · updated live from the forum</p>
      <div className="glass no-scrollbar overflow-x-auto rounded-2xl p-2 sm:p-4">
        <table className="w-full min-w-[420px] text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-[#8a8577]"><th className="p-3">#</th><th className="p-3">Trader</th><th className="p-3 text-right">Threads</th><th className="p-3 text-right">Replies</th><th className="p-3 text-right">Contributions</th></tr></thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.name} className="border-t border-white/5">
                <td className="p-3"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i === 0 ? 'bg-gradient-to-br from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : i === 1 ? 'bg-white/10 text-[#c9c4b4]' : i === 2 ? 'bg-[#a67c1e]/30 text-[#d4af37]' : 'text-[#8a8577]'}`}>{i + 1}</span></td>
                <td className="p-3 font-medium text-[#f0ecdd]">@{t.name}</td>
                <td className="p-3 text-right font-mono text-[#c9c4b4]">{t.threads}</td>
                <td className="p-3 text-right font-mono text-[#c9c4b4]">{t.replies}</td>
                <td className="p-3 text-right font-mono text-emerald-400">{t.contributions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [tab, setTab] = useState('forum');
  return (
    <AppLayout title="Community">
      <div className="mb-5 inline-flex rounded-xl border border-[#d4af37]/15 bg-[#0c0c11] p-1">
        {[{ k: 'forum', l: 'Forum', icon: MessageSquare }, { k: 'leaders', l: 'Leaderboard', icon: Trophy }].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.k ? 'bg-[#d4af37]/12 text-[#f0ecdd]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}><t.icon className="h-4 w-4" /> {t.l}</button>
        ))}
      </div>
      {tab === 'forum' ? <Forum /> : <Leaderboard />}
    </AppLayout>
  );
}
