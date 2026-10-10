// Suspended account — full-page gate. Login still works, but nothing else
// does: the only doors are the support form below and the live chat bubble.
// Every support message is also emailed to the user's own inbox.
import React, { useState } from 'react';
import { ShieldAlert, Send, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { useToast } from '@/hooks/use-toast';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';

export default function SuspendedPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('Review my suspended account');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const detail = user?.user_settings?.suspendedDetail || '';
  const when = user?.user_settings?.suspendedAt
    ? new Date(user.user_settings.suspendedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    try {
      const res = await apiServerClient.fetch('/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}) },
        body: JSON.stringify({ subject: subject.trim() || 'Review my suspended account', message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'could not send');
      setSent(true);
      setMessage('');
      toast({ title: 'Message sent', description: data.emailed ? 'Support will reply by email — a copy was sent to your inbox.' : 'Received — our team will reply by email.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not send', description: err?.message || 'Try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100dvh-var(--header-h))] place-items-center px-4 py-10 pt-[var(--header-h)]">
      <div className="w-full max-w-lg space-y-4">
        <div className="glass rounded-2xl border border-red-400/25 p-8 text-center">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="mx-auto h-12 w-12 rounded-xl object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="mx-auto mt-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-400/10 text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-[#f0ecdd]">Account suspended</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#8a8577]">
            {detail
              ? `Our payout review flagged this account: ${detail}.`
              : 'Our payout review flagged this account for an identity check.'}
            {' '}Withdrawals and trading are paused until support clears it.
            {when ? ` Flagged ${when}.` : ''}
          </p>
          <p className="mt-2 text-xs text-[#5f5b50]">Signed in as {user?.email}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]">
            <MessageCircle className="h-4 w-4 text-[#d4af37]" /> Contact live support
          </h2>
          <p className="mt-1 text-xs text-[#8a8577]">Every message is also emailed to your inbox.</p>
          {sent && <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400">Received — check your email for our reply.</p>}
          <form onSubmit={send} className="mt-3 space-y-2.5">
            <input
              value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-[#e9e7df] outline-none placeholder-[#5f5b50] focus:border-[#d4af37]/50"
              placeholder="Subject" aria-label="Subject" />
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={4000}
              className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-[#e9e7df] outline-none placeholder-[#5f5b50] focus:border-[#d4af37]/50"
              placeholder="Explain what happened — include any payment details you paid with…" aria-label="Message" />
            <button disabled={busy || !message.trim()}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-sm font-bold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-50">
              <Send className="h-4 w-4" /> {busy ? 'Sending…' : 'Send to support'}
            </button>
          </form>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
            <button onClick={() => window.dispatchEvent(new Event('tb:open-live-chat'))} className="text-xs font-semibold text-[#d4af37] hover:underline">Open live chat</button>
            <button onClick={() => { logout(); }} className="flex items-center gap-1.5 text-xs text-[#8a8577] hover:text-[#e9e7df]"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
