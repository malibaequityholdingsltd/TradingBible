import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { avatarUrl } from '@/lib/avatar';
import { displayName } from '@/lib/displayName';
import {
  getThread,
  listConversations,
  markThreadRead,
  searchContacts,
  sendMessage,
} from '@/lib/messages';

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
          <span className="truncate font-semibold text-[#d4af37]">{own ? 'You' : (name || 'Member')}</span>
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
        <p className="text-sm font-semibold text-[#f0ecdd]">{t('aiw.chatsTitle', null, 'Private chats')}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{t('aiw.chatSignIn', null, 'Sign in to chat privately with other members.')}</p>
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
        <MessageCircle className="h-5 w-5" />
      </span>
      <p className="text-xs leading-relaxed text-[#8a8577]">{t('aiw.chatEmpty', null, 'No chats yet. Start a private conversation.')}</p>
      <button type="button" onClick={onCreate} className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[0.08] px-3 text-[11px] font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/15">
        <Plus className="h-3.5 w-3.5" /> {t('aiw.chatNew', null, 'New chat')}
      </button>
    </div>
  );
}

// WhatsApp-style private inbox inside the floating widget. Every row is
// addressed to one member only; the API stores a private copy for each
// participant and never exposes a conversation to anyone else.
export default function DirectChatPanel() {
  const { t } = useI18n();
  const { isAuthed, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    if (!isAuthed) {
      setConversations([]);
      setLoading(false);
      return;
    }
    try {
      const data = await listConversations();
      setConversations(Array.isArray(data) ? data : []);
      setListError('');
    } catch (error) {
      setListError(error?.status === 401
        ? t('aiw.chatSignIn', null, 'Sign in to chat privately with other members.')
        : t('aiw.chatLoadFail', null, 'Could not load chats. Try again.'));
    } finally {
      setLoading(false);
    }
  }, [isAuthed, t]);

  useEffect(() => {
    setLoading(true);
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!isAuthed) return undefined;
    const timer = setInterval(() => { loadConversations(); }, 8_000);
    return () => clearInterval(timer);
  }, [isAuthed, loadConversations]);

  useEffect(() => {
    if (!active?.id || !isAuthed) {
      setMessages([]);
      setMessagesLoading(false);
      return undefined;
    }
    let cancelled = false;
    const load = async (showLoader) => {
      if (showLoader) setMessagesLoading(true);
      try {
        const data = await getThread(active.id);
        if (cancelled) return;
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
        setMessageError('');
        if (data?.peer) {
          setActive((prev) => (prev && prev.id === active.id ? { ...prev, name: data.peer.name || prev.name, avatar: data.peer.avatar || prev.avatar } : prev));
        }
        markThreadRead(active.id).catch(() => {});
        setConversations((prev) => prev.map((item) => (item.peerId === active.id ? { ...item, unread: 0 } : item)));
      } catch (error) {
        if (!cancelled) setMessageError(t('aiw.chatLoadFail', null, 'Could not load this chat. Try again.'));
      } finally {
        if (!cancelled && showLoader) setMessagesLoading(false);
      }
    };
    load(true);
    const timer = setInterval(() => { load(false); }, 4_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active?.id, isAuthed, refreshKey, t]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, active?.id, messagesLoading]);

  useEffect(() => {
    if (!composing || !isAuthed) return undefined;
    const q = contactQuery.trim();
    if (q.length < 2) {
      setContacts([]);
      setContactsLoading(false);
      setContactsError('');
      return undefined;
    }
    let cancelled = false;
    setContactsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchContacts(q);
        if (!cancelled) {
          setContacts(Array.isArray(data) ? data : []);
          setContactsError('');
        }
      } catch (error) {
        if (!cancelled) setContactsError(t('aiw.chatSearchFail', null, 'Could not search members. Try again.'));
      } finally {
        if (!cancelled) setContactsLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [composing, contactQuery, isAuthed, t]);

  const normalized = query.trim().toLowerCase();
  const visibleConversations = conversations.filter((item) => {
    if (!normalized) return true;
    return `${item.peerName || ''} ${item.lastMessage || ''}`.toLowerCase().includes(normalized);
  });

  const openThread = (peer) => {
    setActive(peer);
    setComposing(false);
    setContactQuery('');
    setContacts([]);
    setMessageError('');
    setDraft('');
    setRefreshKey((n) => n + 1);
  };

  const startComposing = () => {
    setComposing(true);
    setContactQuery('');
    setContacts([]);
    setContactsError('');
    setActive(null);
  };

  const send = async (event) => {
    event?.preventDefault?.();
    const body = draft.trim();
    if (!active?.id || !body || busy) return;
    setBusy(true);
    setMessageError('');
    try {
      const data = await sendMessage(active.id, body);
      const message = data?.message;
      if (message) setMessages((prev) => [...prev, message]);
      setDraft('');
      setConversations((prev) => {
        const next = {
          peerId: active.id,
          peerName: active.name,
          peerAvatar: active.avatar,
          lastMessage: body,
          lastAt: message?.at || new Date().toISOString(),
          lastFromMe: true,
          unread: 0,
        };
        const found = prev.some((item) => item.peerId === active.id);
        return found
          ? prev.map((item) => (item.peerId === active.id ? { ...item, ...next } : item))
          : [next, ...prev];
      });
    } catch (error) {
      setMessageError(error?.status === 401
        ? t('aiw.chatSignIn', null, 'Sign in to chat privately with other members.')
        : t('aiw.chatSendFail', null, 'Could not send your message. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthed) return <SignInState t={t} />;

  if (composing) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#d4af37]/12 px-2.5 py-2">
          <button type="button" onClick={() => setComposing(false)} aria-label={t('aiw.chatBack', null, 'Back to chats')} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:border-[#d4af37]/35 hover:text-[#f0ecdd]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-[#f0ecdd]">{t('aiw.chatNew', null, 'New chat')}</div>
            <div className="text-[9px] text-[#8a8577]">{t('aiw.chatSearchMembers', null, 'Find a member by name or username')}</div>
          </div>
        </div>
        <div className="shrink-0 px-3.5 pt-3">
          <label className="flex items-center gap-2 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14]/80 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#6a665a]" aria-hidden />
            <span className="sr-only">{t('aiw.chatSearchMembers', null, 'Find a member by name or username')}</span>
            <input
              value={contactQuery}
              onChange={(event) => setContactQuery(event.target.value)}
              placeholder={t('aiw.chatSearchMembersPh', null, 'Search by name or username…')}
              className="w-full bg-transparent text-[11px] text-[#e9e7df] placeholder-[#6a665a] outline-none"
              autoFocus
            />
          </label>
        </div>
        <div className="relative min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
          {contactQuery.trim().length < 2 ? (
            <p className="px-2 py-8 text-center text-[11px] leading-relaxed text-[#8a8577]">{t('aiw.chatSearchHint', null, 'Type at least two characters to find a member.')}</p>
          ) : contactsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" /></div>
          ) : contactsError ? (
            <p className="px-2 py-8 text-center text-[11px] text-red-300">{contactsError}</p>
          ) : contacts.length === 0 ? (
            <p className="px-2 py-8 text-center text-[11px] text-[#8a8577]">{t('aiw.chatNoMembers', null, 'No members match that search.')}</p>
          ) : contacts.map((contact) => (
            <button key={contact.id} type="button" onClick={() => openThread(contact)} className="group flex w-full items-center gap-2.5 rounded-xl border border-[#d4af37]/10 bg-white/[0.02] px-2.5 py-2.5 text-left transition hover:border-[#d4af37]/35 hover:bg-[#d4af37]/[0.06]">
              <ChatAvatar src={contact.avatar} name={contact.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-[#f0ecdd]">{contact.name}</span>
                {contact.username && <span className="mt-0.5 block truncate text-[10px] text-[#8a8577]">@{contact.username}</span>}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6a665a] transition group-hover:text-[#d4af37]" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (active) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#d4af37]/12 px-2.5 py-2">
          <button type="button" onClick={() => setActive(null)} aria-label={t('aiw.chatBack', null, 'Back to chats')} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:border-[#d4af37]/35 hover:text-[#f0ecdd]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <ChatAvatar src={active.avatar} name={active.name} className="h-8 w-8 text-[11px]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-[#f0ecdd]">{active.name || 'Member'}</div>
            <div className="text-[9px] text-[#8a8577]">{t('aiw.chatPrivate', null, 'Private chat')}</div>
          </div>
          <button type="button" onClick={() => setRefreshKey((n) => n + 1)} aria-label={t('aiw.chatRefresh', null, 'Refresh chats')} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:border-[#d4af37]/35 hover:text-[#f0ecdd]">
            <RefreshCw className={`h-3.5 w-3.5 ${messagesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div ref={scrollRef} className="relative min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" role="log" aria-live="polite">
          {messagesLoading && messages.length === 0 && (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" /></div>
          )}
          {!messagesLoading && messages.length === 0 && !messageError && (
            <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
              <Check className="h-4 w-4 text-[#d4af37]" />
              <p className="text-[10px] leading-relaxed text-[#6a665a]">{t('aiw.chatNoMessages', null, 'No messages yet — say hello.')}</p>
            </div>
          )}
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              own={message.own}
              name={active.name}
              avatar={active.avatar}
              body={message.body}
              at={message.at}
            />
          ))}
          {messageError && <p className="text-center text-[10px] text-red-300">{messageError}</p>}
        </div>

        <form onSubmit={send} className="shrink-0 border-t border-[#d4af37]/12 bg-[#0a0a0f]/70 px-3 pb-3 pt-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/20 bg-[#0f0f14]/90 px-3 py-1 transition-colors focus-within:border-[#d4af37]/50 focus-within:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(event); } }}
              placeholder={t('aiw.chatReplyPh', null, 'Write a message…')}
              className="w-full bg-transparent py-1.5 text-[12px] text-[#e9e7df] placeholder-[#6a665a] outline-none"
              aria-label={t('aiw.chatReplyPh', null, 'Write a message…')}
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label={t('aiw.send', null, 'Send')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_2px_12px_rgba(212,175,55,0.4)] transition hover:opacity-90 disabled:opacity-40 disabled:shadow-none">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-1.5 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#5a564a]">
            {t('aiw.chatPrivateNote', null, 'Only you and this member can see this chat')}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#d4af37]/12 px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d4af37]">{t('aiw.chatsTitle', null, 'Private chats')}</div>
          <div className="truncate text-[9px] text-[#8a8577]">{t('aiw.chatsSub', null, 'Talk privately with other TradingBible members.')}</div>
        </div>
        <button type="button" onClick={() => { loadConversations(); setRefreshKey((n) => n + 1); }} aria-label={t('aiw.chatRefresh', null, 'Refresh chats')} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition hover:border-[#d4af37]/35 hover:text-[#f0ecdd]">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button type="button" onClick={startComposing} className="flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-2.5 text-[10px] font-bold text-[#0a0a0f] transition hover:opacity-90">
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
        ) : listError && conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <AlertCircle className="h-5 w-5 text-[#d4af37]" />
            <p className="text-xs text-[#8a8577]">{listError}</p>
            <button type="button" onClick={loadConversations} className="text-[11px] font-semibold text-[#d4af37] hover:underline">{t('aiw.chatRetry', null, 'Try again')}</button>
          </div>
        ) : visibleConversations.length === 0 ? (
          normalized
            ? <p className="px-2 py-8 text-center text-xs text-[#8a8577]">{t('aiw.chatNoResults', null, 'No chats match your search.')}</p>
            : <EmptyChats t={t} onCreate={startComposing} />
        ) : visibleConversations.map((item) => (
          <button
            key={item.peerId}
            type="button"
            onClick={() => openThread({ id: item.peerId, name: item.peerName, avatar: item.peerAvatar })}
            className="group flex w-full items-center gap-2.5 rounded-xl border border-[#d4af37]/10 bg-white/[0.02] px-2.5 py-2.5 text-left transition hover:border-[#d4af37]/35 hover:bg-[#d4af37]/[0.06]"
          >
            <ChatAvatar src={item.peerAvatar} name={item.peerName} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[12px] font-semibold text-[#f0ecdd]">{item.peerName || 'Member'}</span>
                {item.unread > 0 && <span className="shrink-0 rounded-full bg-[#d4af37] px-1.5 py-px text-[9px] font-bold text-[#0a0a0f]">{item.unread > 9 ? '9+' : item.unread}</span>}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[#8a8577]">{item.lastFromMe ? 'You: ' : ''}{item.lastMessage || ''} · {shortTime(item.lastAt)}</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6a665a] transition group-hover:text-[#d4af37]" />
          </button>
        ))}
      </div>
    </div>
  );
}
