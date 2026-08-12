import React, { useState, useRef } from 'react';
import { PlayCircle, Clock, CheckCircle2, Lock, GraduationCap, Video, Route, Award, Sparkles, Mail, Building2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

function Carousel({ count, itemWidthClass, gridClass, children }) {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const step = el.scrollWidth / count;
    setActive(Math.round(el.scrollLeft / step));
  };
  const goTo = (i) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: (el.scrollWidth / count) * i, behavior: 'smooth' });
  };
  return (
    <div>
      <div ref={ref} onScroll={onScroll} className={`no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 ${gridClass}`}>
        {React.Children.map(children, (c) => (
          <div className={`${itemWidthClass} shrink-0 snap-start md:w-auto`}>{c}</div>
        ))}
      </div>
      <div className={`mt-3 flex justify-center gap-1.5 ${gridClass.includes('md:grid') ? 'md:hidden' : 'sm:hidden'}`}>
        {Array.from({ length: count }).map((_, i) => (
          <button key={i} aria-label={`Go to item ${i + 1}`} onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-[#d4af37]' : 'w-1.5 bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}

const PATHS = [
  { name: 'Beginner Foundation', level: 'Beginner', color: '#34d399', courses: 4, hours: 9, desc: 'Start from zero: how markets work, the assets TradingBible covers, and building disciplined habits from day one.' },
  { name: 'Intermediate Edge', level: 'Intermediate', color: '#d4af37', courses: 4, hours: 16, desc: 'Sharpen your process: advanced technical and fundamental analysis, trading psychology and precise position sizing.' },
  { name: 'Professional Desk', level: 'Professional', color: '#e0a0f0', courses: 4, hours: 26, desc: 'Trade like an institution: algorithmic strategies, portfolio management, advanced risk and fund-grade execution.' },
];

const COURSES = [
  // Beginner
  { title: 'Introduction to Trading', level: 'Beginner', lessons: 8, mins: 64, tag: 'Fundamentals', desc: 'What trading really is, the markets and assets TradingBible covers — Gold, Bitcoin, Forex, Crypto, Commodities and Indices — and the core concepts every trader needs.' },
  { title: 'Risk Management Basics', level: 'Beginner', lessons: 7, mins: 58, tag: 'Risk', desc: 'Position sizing, stop losses and risk/reward. Protect capital first, aligned with TradingBible’s discipline-first philosophy.' },
  { title: 'Technical Analysis 101', level: 'Beginner', lessons: 10, mins: 76, tag: 'Technical', desc: 'Candlesticks, support and resistance, and reading trends using TradingBible’s professional charting tools.' },
  { title: 'Market Types Explained', level: 'Beginner', lessons: 6, mins: 48, tag: 'Markets', desc: 'How Forex, Crypto, Stocks, Commodities and Indices behave — and how to journal them inside the TradingBible terminal.' },
  // Intermediate
  { title: 'Advanced Technical Analysis', level: 'Intermediate', lessons: 12, mins: 98, tag: 'Technical', desc: 'Indicators, chart patterns and confluence, taught with the 14 indicators built into TradingBible.' },
  { title: 'Fundamental Analysis', level: 'Intermediate', lessons: 9, mins: 82, tag: 'Fundamentals', desc: 'Reading economic data, news and earnings using the TradingBible economic calendar and market intelligence.' },
  { title: 'Trading Psychology', level: 'Intermediate', lessons: 11, mins: 90, tag: 'Psychology', desc: 'Master emotions, discipline and mindset. Use your AI Coach discipline scoring to control tilt.' },
  { title: 'Position Sizing Mastery', level: 'Intermediate', lessons: 8, mins: 70, tag: 'Risk', desc: 'Kelly Criterion, risk-per-trade models and portfolio heat with the TradingBible risk tools.' },
  // Professional
  { title: 'Algorithmic Trading', level: 'Professional', lessons: 14, mins: 132, tag: 'Systems', desc: 'Automation, bots and systematic strategies, integrating with TradingBible webhooks and API.', locked: true },
  { title: 'Portfolio Management', level: 'Professional', lessons: 11, mins: 104, tag: 'Portfolio', desc: 'Diversification, allocation and rebalancing across every connected account.', locked: true },
  { title: 'Advanced Risk Management', level: 'Professional', lessons: 12, mins: 118, tag: 'Risk', desc: 'Hedging, correlation and Value at Risk (VaR) for serious capital.', locked: true },
  { title: 'Institutional Trading', level: 'Professional', lessons: 13, mins: 126, tag: 'Institutional', desc: 'Prop trading and fund management, informed by the expertise of TradingBible LLC.', locked: true },
];

const WEBINARS = [
  { title: 'Live Market Open Breakdown', when: 'Every Mon · 08:00 EST', host: 'TradingBible Desk', tag: 'Weekly' },
  { title: 'Journal Review: Fixing Your Worst Trades', when: 'Coming soon', host: 'TradingBible Coaches', tag: 'Upcoming' },
  { title: 'Risk & Position Sizing Q&A', when: 'Coming soon', host: 'TradingBible Research', tag: 'Upcoming' },
];

const LEVEL_COLOR = { Beginner: '#34d399', Intermediate: '#d4af37', Professional: '#e0a0f0' };
const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-3 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 min-h-[48px]';

function Waitlist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user?.username || '', email: user?.email || '', interest: 'Beginner' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email) return;
    setBusy(true);
    try {
      await pb.collection('academy_waitlist').create(form);
      setDone(true);
      toast({ title: 'You’re on the list', description: 'We’ll email you the moment TradingBible Academy launches.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not join', description: 'Please try again.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="glass gold-glow rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-2 text-[#d4af37]"><Sparkles className="h-5 w-5" /><span className="rounded-full bg-[#d4af37]/12 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">Coming Soon</span></div>
      <h2 className="mt-3 text-2xl font-bold text-[#f0ecdd] sm:text-3xl">TradingBible <span className="gold-text">Academy</span></h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#8a8577]">A complete A–Z trading education — from your first candle to institutional desk strategy. Video lessons, quizzes, certificates and progress tracking. Join the waitlist for early access.</p>
      {done ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" /> You’re on the waitlist — check your inbox for launch news.</div>
      ) : (
        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} type="email" required placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className={input} value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>
            {['Beginner', 'Intermediate', 'Professional'].map((o) => <option key={o} className="bg-[#0f0f14]">{o}</option>)}
          </select>
          <button disabled={busy} className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60"><Mail className="h-4 w-4" /> {busy ? 'Joining…' : 'Join the waitlist'}</button>
        </form>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs text-[#6a665a]"><Building2 className="h-3.5 w-3.5" /> A TradingBible LLC education initiative.</div>
    </div>
  );
}

export default function AcademyPage() {
  const [level, setLevel] = useState('All');
  const filtered = level === 'All' ? COURSES : COURSES.filter((c) => c.level === level);

  return (
    <AppLayout title="Academy">
      <div className="mb-6"><Waitlist /></div>

      <div className="mb-3 flex items-center gap-2"><Route className="h-5 w-5 text-[#d4af37]" /><h3 className="font-semibold text-[#f0ecdd]">Learning paths</h3></div>
      <div className="mb-6">
      <Carousel count={PATHS.length} itemWidthClass="w-[82%]" gridClass="md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
        {PATHS.map((p) => (
          <div key={p.name} className="glass glass-hover relative h-full rounded-2xl p-5">
            <span className="absolute right-4 top-4 rounded-full bg-[#d4af37]/12 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#d4af37]">Soon</span>
            <div className="flex items-center gap-2"><Route className="h-4 w-4" style={{ color: p.color }} /><span className="text-xs font-semibold uppercase tracking-wide" style={{ color: p.color }}>{p.level} Path</span></div>
            <h3 className="mt-2 font-semibold text-[#f0ecdd]">{p.name}</h3>
            <p className="mt-1 text-sm text-[#8a8577]">{p.desc}</p>
            <div className="mt-4 flex items-center gap-4 text-xs text-[#8a8577]"><span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {p.courses} courses</span><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {p.hours}h</span></div>
          </div>
        ))}
      </Carousel>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><PlayCircle className="h-5 w-5 text-[#d4af37]" /> Course catalog</h3>
        <div className="flex flex-wrap gap-2">
          {['All', 'Beginner', 'Intermediate', 'Professional'].map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`min-h-[40px] rounded-full px-3.5 py-1.5 text-xs font-medium transition ${level === l ? 'bg-[#d4af37] text-[#0a0a0f]' : 'border border-[#d4af37]/20 text-[#8a8577] hover:text-[#e9e7df]'}`}>{l}</button>
          ))}
        </div>
      </div>

      <Carousel count={filtered.length} itemWidthClass="w-[80%]" gridClass="sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.title} className="glass glass-hover flex h-full flex-col rounded-2xl p-5">
            <div className="mb-3 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-[#1a1a22] to-[#0d0d12]">
              {c.locked ? <Lock className="h-8 w-8 text-[#5f5b50]" /> : <PlayCircle className="h-10 w-10 text-[#d4af37]/70" />}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="rounded-full px-2 py-0.5" style={{ background: `${LEVEL_COLOR[c.level]}1a`, color: LEVEL_COLOR[c.level] }}>{c.level}</span>
              <span className="text-[#8a8577]">{c.tag}</span>
            </div>
            <h4 className="mt-2 font-medium text-[#f0ecdd]">{c.title}</h4>
            <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[#8a8577]">{c.desc}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-[#8a8577]"><span>{c.lessons} lessons</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.mins} min</span><span className="flex items-center gap-1"><Award className="h-3 w-3" /> Certificate</span></div>
            <button disabled className="mt-4 min-h-[44px] w-full cursor-not-allowed rounded-xl border border-[#d4af37]/20 py-2 text-sm font-semibold text-[#8a8577]">Coming soon</button>
          </div>
        ))}
      </Carousel>

      <h3 className="mt-8 mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Video className="h-5 w-5 text-[#d4af37]" /> Live Webinars</h3>
      <Carousel count={WEBINARS.length} itemWidthClass="w-[80%]" gridClass="md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
        {WEBINARS.map((w) => (
          <div key={w.title} className="glass h-full rounded-2xl p-5">
            <span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#d4af37]">{w.tag}</span>
            <h4 className="mt-2 font-medium text-[#f0ecdd]">{w.title}</h4>
            <p className="mt-1 text-xs text-[#8a8577]">Hosted by {w.host}</p>
            <div className="mt-3 flex items-center gap-1 text-sm text-[#c9c4b4]"><Clock className="h-4 w-4 text-[#d4af37]" /> {w.when}</div>
          </div>
        ))}
      </Carousel>

      <div className="mt-8 glass flex flex-col items-center rounded-2xl p-6 text-center sm:flex-row sm:justify-between sm:p-8 sm:text-left">
        <div className="flex items-center gap-4"><Award className="h-10 w-10 text-[#d4af37]" /><div><h3 className="font-semibold text-[#f0ecdd]">Earn your Certified TradingBible Trader badge</h3><p className="text-sm text-[#8a8577]">Complete any learning path to unlock a shareable certificate — available at launch.</p></div></div>
      </div>
    </AppLayout>
  );
}
