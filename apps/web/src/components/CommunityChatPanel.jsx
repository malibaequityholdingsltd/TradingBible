import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Users,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { avatarUrl } from '@/lib/avatar';
import { displayName } from '@/lib/displayName';

const field = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14]/90 px-3 py-2 text-[12px] text-[#e9e7df] placeholder-[#6a665a] outline-none transition-colors focus:border-[#d4af37]/50';

function shortTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 60_000) return 'now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function ChatAvatar({ src, name, className = 'h-8 w-8 text-[11px]' }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 font-bold text-[#d4af37] ${className}`}>
      {src && !broken
        ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
        : (String(name || 'T').trim().charAt(0).toUpperCase() || 'T')}
    </span>
  );
}

function ChatBubble({ own, name, avatar, body, at }) {
  return (
    <div className={`flex gap-2 ${own ? 'flex-row-reverse' : ''}`}>
      <ChatAvatar src={avatar} name={name} />
      <div className={`flex min-w-0 max-w-[84%] flex-col ${own ? 'items-end' : 'items-start'}`}>
        <div className="mb-1 flex max-w-full items-center gap-1.5 text-[9px] text-[#6a665a]">
          <span className="truncate font-semibold text-[#d4af37]">{own ? 'You' : (name || 'Trader')}</span>
          <span className="shrink-0">{shortTime(at)}</span>
        </div>
        <div className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${own
          ? 'rounded-br-md bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_3px_14px_rgba(212,175,55,0.24)]'
          : 'glass rounded-bl-md border border-[#d4af37]/10 text-[#e9e7df] shadow-[0_2px_12px_rgba(0,0,0,0.28)]'}`}>
          {body}
        </div>
      </div>
    </div>
  );
}

function SignInState({ t }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
        <Users className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[#f0ecdd]">{t('aiw.chatsTitle', null, 'Community chats')}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{t('aiw.chatSignIn', null, 'Sign in to chat with other members.')}</p>
      </div>
      <Link to="/login" className="flex min-h-[40px] items-center rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 text-xs font-bold text-[#0a0a0f] transition hover:opacity-90">
        {t('aiw.signinBtn', null, 'Sign in')}
      </Link>
    </div>
  );
}

function EmptyChats({ t, onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/[0.07] text-[#d4af37]">
        <MessageSquare className="h-5 w-5" />
      </span>
      <p className="text-xs leading-relaxed text-[#8a8577]">{t('aiw.chatEmpty', null, 'No chats yet. Start the first conversation.')}</p>
      <button type="button" onClick={onCreate} className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[0.08] px-3 text-[11px] font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/15">
        <Plus className="h-3.5 w-3.5" /> {t('aiw.chatNew', null, 'New chat')}
      </button>
    </div>
  );
}

// Real member-to-member conversations in the floating chat widget. The
// existing community forum is the shared, moderated transport: a thread is a
// chat and replies are messages. No synthetic users, no fake messages.
export default function CommunityChatPanel() {
  const { t } = useI18n();
  const { isAuthed, user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null);
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [formError, setFormError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef(null);

  const loadThreads = useCallback(async () => {
    if (!isAuthed) {
      setThreads([]);
      setLoading(false);
      return;
    }
    try {
      const res = await pb.collection('forum_threads').getList(1, 50, { sort: '-created' });
      setThreads(Array.isArray(res.items) ? res.items : []);
      setListError('');
    } catch {
      setListError(t('aiw.chatLoadFail', null, 'Could not load chats. Try again.'));
    } finally {
      setLoading(false);
    }
  }, [isAuthed, t]);

  useEffect(() => {
    setLoading(true);
    loadThreads();
  }, [loadThreads]);

  // Keep the list fresh while the widget is open without hammering the API.
  useEffect(() => {
    if (!isAuthed) return undefined;
    const timer = setInterval(() => { loadThreads(); }, 20_000);
    return () => clearInterval(timer);
  }, [isAuthed, loadThreads]);

  useEffect(() => {
    if (!active || !isAuthed) {
      setReplies([]);
      setRepliesLoading(false);
      return undefined;
    }
    let cancelled = false;
    const loadReplies = async (showLoader) => {
      if (showLoader) setRepliesLoading(true);
      try {
        const items = await pb.collection('forum_replies').getFullList({
          filter: `thread = "${active.id}"`,
          sort: 'created',
        });
        if (!cancelled) {
          setReplies(items);
          setReplyError('');
        }
      } catch {
        if (!cancelled) setReplyError(t('aiw.chatLoadFail', null, 'Could not load this chat. Try again.'));
      } finally {
        if (!cancelled && showLoader) setRepliesLoading(false);
      }
    };
    loadReplies(true);
    const timer = setInterval(() => { loadReplies(false); }, 12_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, isAuthed, refreshKey, t]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [replies, active, repliesLoading]);

  const normalized = query.trim().toLowerCase();
  const visibleThreads = threads.filter((thread) => {
    if (!normalized) return true;
    return `${thread.title || ''} ${thread.body || ''} ${thread.authorName || ''}`.toLowerCase().includes(normalized);
  });

  const openThread = (thread) => {
    setActive(thread);
    setComposing(false);
    setReplyError('');
    setDraft('');
    setRefreshKey((n) => n + 1);
  };

  const createThread = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const body = form.body.trim();
    if (!user || !title || !body || busy) return;
    setBusy(true);
    setFormError('');
    try {
      const created = await pb.collection('forum_threads').create({
        title: title.slice(0, 120),
        body,
        category: 'General',
        owner: user.id,
        authorName: displayName(user),
        authorAvatar: avatarUrl(user),
        replyCount: 0,
      });
      setForm({ title: '', body: '' });
      setComposing(false);
      setThreads((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      openThread(created);
    } catch {
      setFormError(t('aiw.chatPostFail', null, 'Could not start the chat. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (event) => {
    event?.preventDefault?.();
    const body = draft.trim();
    if (!user || !active || !body || busy) return;
    setBusy(true);
    setReplyError('');
    try {
      const created = await pb.collection('forum_replies').create({
        body,
        thread: active.id,
        owner: user.id,
        authorName: displayName(user),
        authorAvatar: avatarUrl(user),
      });
      setReplies((prev) => [...prev, created]);
      setDraft('');
      const nextCount = (active.replyCount || 0) + 1;
      setActive((prev) => (prev && prev.id === active.id ? { ...prev, replyCount: nextCount } : prev));
      setThreads((prev) => prev.map((thread) => (thread.id === active.id ? { ...thread, replyCount: nextCount } : thread)));
      pb.collection('forum_threads').update(active.id, { replyCount: nextCount }).catch(() => {});
    } catch {
      setReplyError(t('aiw.chatSendFail', null, 'Could not send your message. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthed) return <SignInState t={t} />;

  if (composing) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#d4af37]/12 px-2.5 py-2">
          <button type="button" onClick={() => { setComposing(false); setFormError(''); }} aria-label={t('aiw.chatBack', null, 'Back to chats')} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:border-[#d4af37]/35 hover:text-[#f0ecdd]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-[#f0ecdd]">{t('aiw.chatNew', null, 'New chat')}</div>
            <div className="text-[9px] text-[#8a8577]">{t('aiw.chatPublic', null, 'Public to all members')}</div>
          </div>
        </div>
        <form onSubmit={createThread} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a8577]" htmlFor="community-chat-title">
            {t('aiw.chatTitleLabel', null, 'Topic')}
          </label>
          <input
            id="community-chat-title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder={t('aiw.chatTitlePh', null, 'What do you want to talk about?')}
            maxLength={120}
            className={field}
            autoFocus
          />
          <label className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a8577]" htmlFor="community-chat-body">
            {t('aiw.chatMessageLabel', null, 'Message')}
          </label>
          <textarea
            id="community-chat-body"
            value={form.body}
            onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
            placeholder={t('aiw.chatBodyPh', null, 'Write your first message…')}
            className={`${field} min-h-[7rem] flex-1 resize-none`}
          />
          {formError && <p className="flex items-center gap-1.5 text-[10px] text-red-300"><AlertCircle className="h-3 w-3" />{formError}</p>}
          <div className="mt-auto flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setComposing(false); setFormError(''); }} className="min-h-[36px] rounded-lg px-3 text-[11px] font-semibold text-[#8a8577] transition hover:text-[#f0ecdd]">
              {t('aiw.chatCancel', null, 'Cancel')}
            </button>
            <button type="submit" disabled={busy || !form.title.trim() || !form.body.trim()} className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 text-[11px] font-bold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-40">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {t('aiw.chatCreate', null, 'Start chat')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (active) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#d4af37]/12 px-2.5 py-2">
          <button type="button" onClick={() => { setActive(null); setReplyError(''); }} aria-label={t('aiw.chatBack', null, 'Back to chats')} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:border-[#d4af37]/35 hover:text-[#f0ecdd]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-[#f0ecdd]">{active.title}</div>
            <div className="flex items-center gap-1 text-[9px] text-[#8a8577]"><Users className="h-2.5 w-2.5" /> {t('aiw.chatPublic', null, 'Public to all members')}</div>
          </div>
          <button type="button" onClick={() => setRefreshKey((n) => n + 1)} aria-label={t('aiw.chatRefresh', null, 'Refresh chats')} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:border-[#d4af37]/35 hover:text-[#f0ecdd]">
            <RefreshCw className={`h-3.5 w-3.5 ${repliesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div ref={scrollRef} className="relative min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" role="log" aria-live="polite">
          <ChatBubble
            own={active.owner === user?.id}
            name={active.authorName || 'Trader'}
            avatar={active.authorAvatar}
            body={active.body}
            at={active.created}
          />
          {replies.map((reply) => (
            <ChatBubble
              key={reply.id}
              own={reply.owner === user?.id}
              name={reply.authorName || 'Trader'}
              avatar={reply.authorAvatar}
              body={reply.body}
              at={reply.created}
            />
          ))}
          {repliesLoading && (
            <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" /></div>
          )}
          {!repliesLoading && replies.length === 0 && (
            <p className="px-2 text-center text-[10px] text-[#6a665a]">{t('aiw.chatNoReplies', null, 'No replies yet — say hello.')}</p>
          )}
          {replyError && <p className="text-center text-[10px] text-red-300">{replyError}</p>}
        </div>

        <form onSubmit={sendReply} className="shrink-0 border-t border-[#d4af37]/12 bg-[#0a0a0f]/70 px-3 pb-3 pt-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/20 bg-[#0f0f14]/90 px-3 py-1 transition-colors focus-within:border-[#d4af37]/50 focus-within:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendReply(event); } }}
              placeholder={t('aiw.chatReplyPh', null, 'Write a message…')}
              className="w-full bg-transparent py-1.5 text-[12px] text-[#e9e7df] placeholder-[#6a665a] outline-none"
              aria-label={t('aiw.chatReplyPh', null, 'Write a message…')}
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label={t('aiw.send', null, 'Send')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_2px_12px_rgba(212,175,55,0.4)] transition hover:opacity-90 disabled:opacity-40 disabled:shadow-none">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-1.5 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#5a564a]">
            {t('aiw.chatPublicNote', null, 'Visible to every TradingBible member')} <span className="animate-pulse text-[#d4af37]/70">▊</span>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#d4af37]/12 px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d4af37]">{t('aiw.chatsTitle', null, 'Community chats')}</div>
          <div className="truncate text-[9px] text-[#8a8577]">{t('aiw.chatsSub', null, 'Talk with other TradingBible members.')}</div>
        </div>
        <button type="button" onClick={() => { loadThreads(); setRefreshKey((n) => n + 1); }} aria-label={t('aiw.chatRefresh', null, 'Refresh chats')} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:border-[#d4af37]/35 hover:text-[#f0ecdd]">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button type="button" onClick={() => { setComposing(true); setFormError(''); }} className="flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-2.5 text-[10px] font-bold text-[#0a0a0f] transition hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> {t('aiw.chatNew', null, 'New chat')}
        </button>
      </div>

      <div className="shrink-0 px-3.5 pt-2.5">
        <label className="flex items-center gap-2 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14]/80 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#6a665a]" aria-hidden />
          <span className="sr-only">{t('aiw.chatSearch', null, 'Search chats')}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('aiw.chatSearch', null, 'Search chats…')}
            className="w-full bg-transparent text-[11px] text-[#e9e7df] placeholder-[#6a665a] outline-none"
          />
        </label>
      </div>

      <div className="relative min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3.5 py-3">
        {loading ? (
          <div className="space-y-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.03]" />)}
          </div>
        ) : listError && threads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <AlertCircle className="h-5 w-5 text-[#d4af37]" />
            <p className="text-xs text-[#8a8577]">{listError}</p>
            <button type="button" onClick={loadThreads} className="text-[11px] font-semibold text-[#d4af37] hover:underline">{t('aiw.chatRetry', null, 'Try again')}</button>
          </div>
        ) : visibleThreads.length === 0 ? (
          normalized
            ? <p className="px-2 py-8 text-center text-xs text-[#8a8577]">{t('aiw.chatNoResults', null, 'No chats match your search.')}</p>
            : <EmptyChats t={t} onCreate={() => { setComposing(true); setFormError(''); }} />
        ) : visibleThreads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => openThread(thread)}
            className="group flex w-full items-center gap-2.5 rounded-xl border border-[#d4af37]/10 bg-white/[0.02] px-2.5 py-2.5 text-left transition hover:border-[#d4af37]/35 hover:bg-[#d4af37]/[0.06]"
          >
            <ChatAvatar src={thread.authorAvatar} name={thread.authorName || 'Trader'} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[12px] font-semibold text-[#f0ecdd]">{thread.title}</span>
                {(thread.replyCount || 0) > 0 && <span className="shrink-0 rounded-full bg-[#d4af37]/10 px-1.5 py-px text-[9px] font-bold text-[#d4af37]">{thread.replyCount}</span>}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[#8a8577]">{thread.authorName || 'Trader'} · {shortTime(thread.created)}</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6a665a] transition group-hover:text-[#d4af37]" />
          </button>
        ))}
      </div>
    </div>
  );
}
