import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	PlayCircle, Clock, CheckCircle2, Lock, GraduationCap, Video, Route, Award, Sparkles,
	Rocket, BookOpen, Bot, ArrowLeft, RotateCcw, ChevronRight, Trophy, Calendar, Radio, Loader2,
	MessageSquare, Send, BadgeCheck, CircleDollarSign, Wallet, Search, Globe, Bitcoin,
	Sprout, Zap, Briefcase, Layers, Filter, Timer, Library,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { openAcademyCheckout, getStripeConfig } from '@/lib/stripe';
import { useWallet } from '@/hooks/useWallet';
import {
	getAcademyAccess, enrollInPath, getCurriculum, getLesson, gradeQuiz,
	completeLesson, getAcademyProgress, claimCertificate, rsvpWebinar, unrsvpWebinar, attendWebinar,
} from '@/lib/academy';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { PATHS, STATIC_CURRICULA, WEBINAR_CATALOG, TRACKS, getTopicIndex, pathStats } from '@/lib/academyCatalog';

// ── Path icon map ────────────────────────────────────────────────────
const PATH_ICONS = { sprout: Sprout, globe: Globe, bitcoin: Bitcoin, zap: Zap, briefcase: Briefcase };
const TRACK_COLORS = { general: '#34d399', forex: '#38bdf8', crypto: '#f472b6', pro: '#d4af37' };
function PathIcon({ icon, color }) {
	const C = PATH_ICONS[icon] || Route;
	return <C className="h-5 w-5" style={{ color }} />;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TZ = 'America/New_York';

function nextOccurrence(day, hour) {
	const now = new Date();
	const formatter = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', hour: 'numeric', hour12: false });
	const parts = formatter.formatToParts(now);
	const hourNow = Number(parts.find((p) => p.type === 'hour')?.value || 0);
	const weekdayNow = WEEKDAYS.indexOf(parts.find((p) => p.type === 'weekday')?.value || '');
	let diff = (day - weekdayNow + 7) % 7;
	if (diff === 0 && hourNow >= hour) diff = 7;
	const next = new Date(now);
	next.setDate(next.getDate() + diff);
	next.setHours(hour, 0, 0, 0);
	return next;
}

function getWebinarState(w) {
	const start = nextOccurrence(w.day, w.hour);
	const end = new Date(start.getTime() + w.duration * 60000);
	const now = Date.now();
	if (now >= start.getTime() && now < end.getTime()) return { live: true, start, end };
	return { live: false, start, end };
}

function fmtCountdown(target, t) {
	const diff = target.getTime() - Date.now();
	if (diff <= 0) return t ? t('aca.cdLive') : 'live now';
	const d = Math.floor(diff / 86400000);
	const h = Math.floor((diff % 86400000) / 3600000);
	const m = Math.floor((diff % 3600000) / 60000);
	if (d > 0) return `${d}d ${h}h ${m}m`;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

// ── Tiny safe markdown renderer ──────────────────────────────────────
function escapeHtml(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
	let out = escapeHtml(text);
	out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-[#d4af37]/10 px-1 py-0.5 text-xs">$1</code>');
	return out;
}

function Markdown({ text }) {
	const blocks = useMemo(() => {
		const lines = String(text || '').split('\n');
		const out = [];
		let list = null;
		const flushList = () => { if (list) { out.push(<ul key={out.length} className="my-2 list-disc space-y-1 pl-5">{list.map((li, i) => <li key={i} className="text-sm leading-relaxed text-[#c9c4b4]" dangerouslySetInnerHTML={{ __html: inlineMarkdown(li) }} />)}</ul>); list = null; } };
		for (const raw of lines) {
			const line = raw.trimEnd();
			if (!line.trim()) { flushList(); continue; }
			if (line.startsWith('### ')) { flushList(); out.push(<h4 key={out.length} className="mt-4 text-sm font-bold uppercase tracking-wide text-[#d4af37]">{line.slice(4)}</h4>); continue; }
			if (line.startsWith('## ')) { flushList(); out.push(<h3 key={out.length} className="mt-5 text-lg font-bold text-[#f0ecdd]">{line.slice(3)}</h3>); continue; }
			if (line.startsWith('# ')) { flushList(); out.push(<h2 key={out.length} className="mt-5 text-xl font-bold text-[#f0ecdd]">{line.slice(2)}</h2>); continue; }
			if (/^[-*]\s+/.test(line)) { (list || (list = [])).push(line.replace(/^[-*]\s+/, '')); continue; }
			if (/^\d+\.\s+/.test(line)) { (list || (list = [])).push(line.replace(/^\d+\.\s+/, '')); continue; }
			flushList();
			out.push(<p key={out.length} className="my-2 text-sm leading-relaxed text-[#c9c4b4]" dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />);
		}
		flushList();
		return out;
	}, [text]);
	return <div>{blocks}</div>;
}

// ── Generic SSE chat (AI Tutor + Webinar AI host) ────────────────────
function AIChat({ endpoint, buildBody, placeholder, accent = '#d4af37' }) {
	const { t } = useI18n();
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [streaming, setStreaming] = useState(false);
	const scrollRef = useRef(null);
	const abortRef = useRef(null);
	const { toast } = useToast();

	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages]);

	const send = async (text) => {
		if (!text.trim() || streaming) return;
		const userMsg = { role: 'user', content: text };
		const history = messages.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-8);
		setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
		setInput('');
		setStreaming(true);
		const controller = new AbortController();
		abortRef.current = controller;
		try {
			const res = await window.fetch(API_SERVER_URL + endpoint, {
				method: 'POST',
				headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
				body: JSON.stringify(buildBody({ history, question: text })),
				signal: controller.signal,
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.error?.message || 'The AI could not respond right now.');
			}
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const events = buffer.split('\n\n');
				buffer = events.pop() || '';
				for (const event of events) {
					const line = event.split('\n').find((l) => l.startsWith('data: '));
					if (!line) continue;
					let parsed;
					try { parsed = JSON.parse(line.slice(6)); } catch { continue; }
					if (parsed.type === 'error') throw new Error(parsed.data.content);
					if (parsed.type === 'completed') { reader.cancel(); return; }
					if (parsed.type === 'content' && parsed.data?.content) {
						const delta = parsed.data.content;
						setMessages((prev) => {
							const next = [...prev];
							const last = next[next.length - 1];
							if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + delta };
							return next;
						});
					}
				}
			}
		} catch (err) {
			if (err.name === 'AbortError') return;
			setMessages((prev) => {
				const next = [...prev];
				const last = next[next.length - 1];
				if (last?.role === 'assistant' && !last.content) next.pop();
				return next;
			});
			toast({ variant: 'destructive', title: t('c.error'), description: err.message });
		} finally {
			abortRef.current = null;
			setStreaming(false);
		}
	};

	return (
		<div className="flex h-[380px] flex-col overflow-hidden rounded-2xl border border-[#d4af37]/15 bg-[#0d0d12]/60 backdrop-blur-xl">
			<div className="flex items-center gap-2 border-b border-[#d4af37]/10 px-4 py-3">
				<Bot className="h-4 w-4" style={{ color: accent }} />
				<span className="text-sm font-semibold text-[#f0ecdd]">{placeholder}</span>
				{streaming && <Loader2 className="ml-auto h-4 w-4 animate-spin text-[#d4af37]" />}
			</div>
			<div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
				{messages.length === 0 && (
					<p className="text-xs leading-relaxed text-[#6a665a]">{t('aca.askAnything')}</p>
				)}
				{messages.map((m, i) => (
					<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
						<div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed backdrop-blur-md ${m.role === 'user' ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'border border-[#d4af37]/12 bg-[#111113]/85 text-[#c9c4b4]'}`}>
							{m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
						</div>
					</div>
				))}
			</div>
			<div className="flex items-center gap-2 border-t border-[#d4af37]/10 p-3">
				<input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
					disabled={streaming}
					placeholder={streaming ? t('aca.typing') : t('aca.askTutorPh')}
					className="min-h-[42px] flex-1 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 disabled:opacity-60"
				/>
				<button
					onClick={() => send(input)}
					disabled={streaming || !input.trim()}
					className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-50"
				><Send className="h-4 w-4" /></button>
			</div>
		</div>
	);
}

// ── Paywall ($150 lifetime) ──────────────────────────────────────────
function Paywall({ onPurchased }) {
	const { toast } = useToast();
	const { t } = useI18n();
	const [busy, setBusy] = useState(false);
	const [configured, setConfigured] = useState(true);
	const [checked, setChecked] = useState(false);
	const { ledger, payWithWallet } = useWallet();
	const walletBalance = ledger?.balances?.USD || 0;

	useEffect(() => {
		getStripeConfig().then((cfg) => {
			setConfigured(Boolean(cfg?.prices?.academy));
		}).catch(() => {}).finally(() => setChecked(true));
	}, []);

	const buy = async () => {
		setBusy(true);
		try {
			await openAcademyCheckout();
		} catch (err) {
			toast({ variant: 'destructive', title: t('c.error'), description: err.message });
		} finally { setBusy(false); }
	};

	const buyWithWallet = async () => {
		setBusy(true);
		try {
			await payWithWallet('academy');
			toast({ title: t('aca.badge'), description: t('bill.payWallet') });
			onPurchased();
		} catch (err) {
			toast({ variant: 'destructive', title: t('bill.payWallet'), description: err.message });
		} finally { setBusy(false); }
	};

	const features = [
		{ icon: Route, text: '5 learning paths — Beginner, Forex Mastery, Crypto Mastery, Intermediate, Professional' },
		{ icon: Library, text: '100+ Forex & Crypto topics: pairs, sessions, perps, funding, on-chain, SMC, news, DeFi' },
		{ icon: Video, text: '8 live webinars / week with an AI host — FX London lab, crypto on-chain lab, news reactions' },
		{ icon: Bot, text: 'One-on-one AI tutor inside every lesson' },
		{ icon: Trophy, text: 'AI-graded quizzes and shareable certificates per path' },
		{ icon: Award, text: 'Lifetime access — one payment, forever' },
	];

	return (
		<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-6 sm:p-10">
			<div className="flex flex-col items-center text-center">
				<div className="flex items-center gap-2 text-[#d4af37]">
					<GraduationCap className="h-6 w-6" />
					<span className="rounded-full bg-[#d4af37]/12 px-3 py-1 text-xs font-semibold uppercase tracking-wider">{t('aca.badge')}</span>
				</div>
				<h2 className="mt-4 max-w-2xl text-3xl font-bold text-[#f0ecdd] sm:text-4xl">
					{t('aca.titleA')} <span className="gold-text">{t('aca.titleB')}</span> {t('aca.titleC')}
				</h2>
				<p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">
					{t('aca.sub')}
				</p>
				<div className="mt-4 flex flex-wrap justify-center gap-2">
					{['Forex: pairs → prop firms', 'Crypto: wallets → perps → on-chain', 'Risk, psychology & playbooks'].map((s) => (
						<span key={s} className="rounded-full border border-[#d4af37]/20 px-3 py-1 text-xs text-[#c9c4b4]">{s}</span>
					))}
				</div>

				<div className="mt-6 flex items-end gap-1.5">
					<span className="text-5xl font-bold gold-text">$150</span>
					<span className="mb-1.5 text-sm text-[#8a8577]">{t('aca.priceNote')}</span>
				</div>

				<div className="mt-6 flex flex-col items-center gap-3">
					<button
						onClick={buy}
						disabled={busy || (checked && !configured)}
						className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-8 text-base font-bold text-[#0a0a0f] shadow-[0_0_30px_rgba(212,175,55,0.35)] transition hover:opacity-90 disabled:opacity-60"
					>
						{busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {t('aca.opening')}</> : <><CircleDollarSign className="h-5 w-5" /> {t('aca.cta')}</>}
					</button>
					<button onClick={buyWithWallet} disabled={busy || walletBalance < 150} className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#d4af37]/20 px-6 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:opacity-40">
						<Wallet className="h-4 w-4" /> {t('aca.walletPay')} ({walletBalance >= 150 ? t('aca.available') : t('aca.needMore', { amt: `$${(150 - walletBalance).toFixed(2)}` })})
					</button>
					<div className="text-xs text-[#8a8577]">${walletBalance.toFixed(2)} · <a href="/app/wallet" className="text-[#d4af37] hover:underline">{t('bill.fundWallet')}</a></div>
				</div>
			<p className="mt-3 text-xs text-[#6a665a]">{t('aca.guarantee')}</p>
			</div>

			<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{features.map((f) => (
					<div key={f.text} className="glass flex items-start gap-3 rounded-xl p-4">
						<f.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" />
						<span className="text-sm text-[#c9c4b4]">{f.text}</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ── Lesson view (content + quiz + tutor) ─────────────────────────────
function LessonView({ pathKey, curriculum, course, lesson, progress, onBack, onLessonDone }) {
	const { t } = useI18n();
	const [state, setState] = useState({ status: 'loading', content: null, error: '' });
	const [answers, setAnswers] = useState([]);
	const [grade, setGrade] = useState(null);
	const [grading, setGrading] = useState(false);
	const [done, setDone] = useState(progress?.completed);
	const { toast } = useToast();

	useEffect(() => { document.title = `${lesson.title} · ${t('aca.page')}`; }, [lesson.title, t]);

	const load = useCallback(() => {
		setState({ status: 'loading', content: null, error: '' });
		getLesson(pathKey, course.courseKey, lesson.lessonKey)
			.then((res) => {
				setAnswers(Array(res.content.quiz?.length || 0).fill(null));
				setGrade(null);
				setState({ status: 'ready', content: res.content });
			})
			.catch((err) => setState({ status: 'error', content: null, error: err.message }));
	}, [pathKey, course, lesson]);

	useEffect(() => { load(); }, [load]);

	const submitQuiz = async () => {
		if (answers.some((a) => a === null)) {
			toast({ title: t('aca.answerAll'), description: t('aca.answerAllSub') });
			return;
		}
		setGrading(true);
		try {
			const res = await gradeQuiz(pathKey, course.courseKey, lesson.lessonKey, answers);
			setGrade(res);
		} catch (err) {
			toast({ variant: 'destructive', title: t('aca.gradeFail'), description: err.message });
		} finally { setGrading(false); }
	};

	const markDone = async () => {
		try {
			await completeLesson(pathKey, course.courseKey, lesson.lessonKey);
			setDone(true);
			onLessonDone();
			toast({ title: t('aca.lessonDone'), description: t('aca.lessonDoneSub') });
		} catch (err) {
			toast({ variant: 'destructive', title: t('aca.saveFail'), description: err.message });
		}
	};

	if (state.status === 'loading') {
		return (
			<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
				<Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
				<p className="mt-4 text-sm text-[#c9c4b4]">{t('aca.writing')}</p>
				<p className="mt-1 text-xs text-[#6a665a]">{t('aca.writingSub')}</p>
			</div>
		);
	}

	if (state.status === 'error') {
		return (
			<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
				<p className="text-sm text-[#e9e7df]">{state.error}</p>
				<button onClick={load} className="mt-4 flex items-center gap-2 rounded-xl border border-[#d4af37]/20 px-4 py-2 text-sm text-[#d4af37] hover:bg-[#d4af37]/10"><RotateCcw className="h-4 w-4" /> {t('aca.tryAgain')}</button>
			</div>
		);
	}

	const { content } = state;

	return (
		<div className="space-y-4">
			<button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#8a8577] transition hover:text-[#d4af37]"><ArrowLeft className="h-4 w-4" /> {t('aca.backTo', { path: curriculum.pathName })}</button>

			<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
				<div className="flex flex-wrap items-center gap-2 text-xs">
					<span className="rounded-full bg-[#d4af37]/12 px-2.5 py-0.5 text-[#d4af37]">{course.title}</span>
					<span className="flex items-center gap-1 text-[#8a8577]"><Clock className="h-3 w-3" /> {t('aca.minutes', { n: lesson.minutes })}</span>
					{done && <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> {t('aca.completed')}</span>}
				</div>
				<h2 className="mt-3 text-2xl font-bold text-[#f0ecdd]">{content.title}</h2>
				<p className="mt-2 text-sm text-[#c9c4b4]">{content.summary}</p>
				{content.keyPoints?.length > 0 && (
					<div className="mt-4 flex flex-wrap gap-2">
						{content.keyPoints.map((k, i) => (
							<span key={i} className="rounded-full border border-[#d4af37]/20 px-2.5 py-1 text-xs text-[#c9c4b4]">{k}</span>
						))}
					</div>
				)}
			</div>

			<div className="glass rounded-2xl p-5 sm:p-6">
				<Markdown text={content.content} />
			</div>

			{content.quiz?.length > 0 && (
				<div className="glass rounded-2xl p-5 sm:p-6">
					<h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Award className="h-5 w-5 text-[#d4af37]" /> {t('aca.quizTitle')}</h3>
					{grade ? (
						<div className="mt-4">
							<div className={`flex items-center gap-3 rounded-xl p-4 backdrop-blur-md ${grade.score >= Math.ceil(grade.total / 2) ? 'bg-emerald-400/10' : 'bg-[#d4af37]/10'}`}>
								{grade.score >= Math.ceil(grade.total / 2) ? <BadgeCheck className="h-6 w-6 text-emerald-400" /> : <Sparkles className="h-6 w-6 text-[#d4af37]" />}
								<div>
									<p className="font-semibold text-[#f0ecdd]">{t('aca.scoreN', { s: grade.score, n: grade.total })}</p>
									{grade.feedback && <p className="mt-1 text-sm leading-relaxed text-[#c9c4b4]">{grade.feedback}</p>}
								</div>
							</div>
							<div className="mt-4 space-y-4">
								{content.quiz.map((q, qi) => {
									const correct = answers[qi] === q.answerIndex;
									return (
										<div key={qi} className={`rounded-xl border p-4 ${correct ? 'border-emerald-400/25' : answers[qi] === null ? 'border-[#d4af37]/10' : 'border-[#d4af37]/40'}`}>
											<p className="text-sm font-medium text-[#f0ecdd]">{qi + 1}. {q.question}</p>
											<p className="mt-1 text-xs text-[#8a8577]">{correct ? t('aca.correct') : answers[qi] === null ? t('aca.skipped') : t('aca.incorrect')} — {q.explanation}</p>
										</div>
									);
								})}
							</div>
							<button onClick={() => { setGrade(null); setAnswers(Array(content.quiz.length).fill(null)); }} className="mt-4 flex items-center gap-2 rounded-xl border border-[#d4af37]/20 px-4 py-2 text-sm text-[#d4af37] hover:bg-[#d4af37]/10"><RotateCcw className="h-4 w-4" /> {t('aca.retake')}</button>
						</div>
					) : (
						<div className="mt-4 space-y-4">
							{content.quiz.map((q, qi) => (
								<div key={qi} className="rounded-xl border border-[#d4af37]/12 p-4">
									<p className="text-sm font-medium text-[#f0ecdd]">{qi + 1}. {q.question}</p>
									<div className="mt-2.5 grid gap-2 sm:grid-cols-2">
										{q.options.map((opt, oi) => (
											<button
												key={oi}
												onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
												className={`min-h-[42px] rounded-lg border px-3 text-left text-sm transition ${answers[qi] === oi ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#f0ecdd]' : 'border-[#d4af37]/15 text-[#8a8577] hover:border-[#d4af37]/40 hover:text-[#c9c4b4]'}`}
											>{String.fromCharCode(65 + oi)}. {opt}</button>
										))}
									</div>
								</div>
							))}
							<button onClick={submitQuiz} disabled={grading} className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-6 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60">
								{grading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('aca.grading')}</> : <>{t('aca.submitGrading')}</>}
							</button>
						</div>
					)}
				</div>
			)}

			{!done && (
				<div className="flex justify-end">
					<button onClick={markDone} className="flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-6 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">
						<CheckCircle2 className="h-4 w-4" /> {t('aca.markDone')}
					</button>
				</div>
			)}

			<div>
				<h3 className="mb-3 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Bot className="h-5 w-5 text-[#d4af37]" /> {t('aca.tutorTitle')}</h3>
				<AIChat
					endpoint="/academy/tutor/stream"
					placeholder={t('aca.tutorPh')}
					buildBody={({ history, question }) => ({ pathKey, courseKey: course.courseKey, lessonKey: lesson.lessonKey, history, question })}
				/>
			</div>
		</div>
	);
}

// ── Curriculum (enrolled path) ───────────────────────────────────────
function CurriculumView({ pathKey, curriculum, progressMap, onOpenLesson, onLeave, certificate, isPreview }) {
	const { t } = useI18n();
	const [courseIndex, setCourseIndex] = useState(0);
	const totalLessons = curriculum.courses.reduce((a, c) => a + c.lessons.length, 0);
	const completed = curriculum.courses.reduce((a, c) => a + c.lessons.filter((l) => progressMap[`${c.courseKey}:${l.lessonKey}`]?.completed).length, 0);
	const pct = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;

	return (
		<div className="space-y-4">
			<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#d4af37]"><Route className="h-4 w-4" /> {curriculum.pathName}</div>
						<p className="mt-1 max-w-xl text-sm text-[#c9c4b4]">{curriculum.focus}</p>
						{isPreview && (
							<p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#38bdf8]/10 px-2.5 py-1 text-[11px] text-[#38bdf8]"><Loader2 className="h-3 w-3 animate-spin" /> AI is personalizing this path — full topic map below.</p>
						)}
					</div>
					<button onClick={onLeave} className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/20 px-3.5 py-2 text-xs text-[#8a8577] hover:text-[#d4af37]"><ArrowLeft className="h-3.5 w-3.5" /> {t('aca.allPaths')}</button>
				</div>
				<div className="mt-4">
					<div className="flex items-center justify-between text-xs text-[#8a8577]">
						<span>{t('aca.lessonsN', { d: completed, n: totalLessons })}</span>
						<span>{pct}%</span>
					</div>
					<div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#d4af37]/10">
						<div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] transition-all" style={{ width: `${pct}%` }} />
					</div>
				</div>
			</div>

			{certificate?.certificateCode && (
				<div className="rounded-2xl border border-[#d4af37]/25 bg-gradient-to-br from-[#d4af37]/[0.1] via-[#d4af37]/[0.04] to-transparent p-5 backdrop-blur-xl sm:p-6">
					<div className="flex flex-wrap items-center gap-3">
						<Trophy className="h-8 w-8 text-[#d4af37]" />
						<div className="min-w-0 flex-1">
							<h3 className="font-bold text-[#f0ecdd]">{t('aca.certifiedPf', { path: curriculum.pathName })}</h3>
							<p className="mt-1 text-xs text-[#8a8577]">{t('aca.codePf')} <span className="font-mono text-[#d4af37]">{certificate.certificateCode}</span></p>
							{certificate.certificateText && <p className="mt-2 text-sm italic leading-relaxed text-[#c9c4b4]">“{certificate.certificateText}”</p>}
						</div>
						<BadgeCheck className="h-10 w-10 shrink-0 text-[#d4af37]" />
					</div>
				</div>
			)}

			<div className="mb-3 flex flex-wrap gap-2">
				{curriculum.courses.map((c, i) => (
					<button key={c.courseKey} onClick={() => setCourseIndex(i)}
						className={`min-h-[40px] rounded-full px-4 py-1.5 text-xs font-medium transition ${courseIndex === i ? 'bg-[#d4af37] text-[#0a0a0f]' : 'border border-[#d4af37]/20 text-[#8a8577] hover:text-[#e9e7df]'}`}>
						{c.title}
					</button>
				))}
			</div>

			<div className="glass rounded-2xl p-5">
				{courseIndex < curriculum.courses.length && (() => {
					const course = curriculum.courses[courseIndex];
					const done = course.lessons.filter((l) => progressMap[`${course.courseKey}:${l.lessonKey}`]?.completed).length;
					return (
						<>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<h3 className="font-semibold text-[#f0ecdd]">{course.title}</h3>
								<span className="text-xs text-[#8a8577]">{t('aca.doneMin', { d: done, n: course.lessons.length, m: course.minutes })}</span>
							</div>
							<p className="mt-1 text-sm text-[#8a8577]">{course.description}</p>
							<div className="mt-4 space-y-2.5">
								{course.lessons.map((l, li) => {
									const prog = progressMap[`${course.courseKey}:${l.lessonKey}`];
									const isDone = prog?.completed;
									return (
										<button key={l.lessonKey} onClick={() => onOpenLesson(course, l)}
											className="group flex w-full items-center gap-3 rounded-xl border border-[#d4af37]/12 p-3.5 text-left transition hover:border-[#d4af37]/40 hover:bg-[#d4af37]/[0.04]">
											<span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${isDone ? 'bg-emerald-400/15 text-emerald-400' : 'bg-[#d4af37]/12 text-[#d4af37]'}`}>
												{isDone ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
											</span>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-medium text-[#f0ecdd]">{li + 1}. {l.title}</span>
												<span className="mt-0.5 flex items-center gap-2 text-xs text-[#8a8577]">
													<span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t('aca.minutes', { n: l.minutes })}</span>
													{prog?.quizScore !== null && prog?.quizScore !== undefined && <span>· {t('aca.quizN', { s: prog.quizScore, n: prog.quizTotal })}</span>}
												</span>
											</span>
											<ChevronRight className="h-4 w-4 shrink-0 text-[#6a665a] transition group-hover:text-[#d4af37]" />
										</button>
									);
								})}
							</div>
						</>
					);
				})()}
			</div>
		</div>
	);
}

// ── Topic explorer card ──────────────────────────────────────────────
function TopicExplorer({ onStartPath }) {
	const [q, setQ] = useState('');
	const [track, setTrack] = useState('all');
	const topics = useMemo(() => getTopicIndex(), []);
	const filtered = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return topics.filter((tp) => {
			if (track !== 'all' && !(tp.tags || []).includes(track) && tp.track !== track) return false;
			if (!needle) return true;
			return `${tp.title} ${tp.courseTitle} ${tp.pathName}`.toLowerCase().includes(needle);
		});
	}, [topics, q, track]);

	const grouped = useMemo(() => {
		const map = new Map();
		for (const tp of filtered) {
			const k = `${tp.pathKey}::${tp.courseKey}`;
			if (!map.has(k)) map.set(k, { pathKey: tp.pathKey, pathName: tp.pathName, courseKey: tp.courseKey, courseTitle: tp.courseTitle, items: [] });
			map.get(k).items.push(tp);
		}
		return [...map.values()];
	}, [filtered]);

	return (
		<div className="space-y-4">
			<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
				<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#d4af37]"><Library className="h-4 w-4" /> Topic library — every Forex & Crypto lesson</div>
				<h2 className="mt-1.5 text-xl font-bold text-[#f0ecdd] sm:text-2xl">Search {topics.length}+ topics</h2>
				<p className="mt-1 max-w-2xl text-sm text-[#8a8577]">Pips, lots & leverage · sessions & killzones · CPI/NFP news · SMC/ICT · carry & breakouts · wallets & custody · perps, funding & OI · on-chain · DeFi · volatility sizing and more. Pick a topic to jump into its path.</p>
				<div className="mt-4 flex flex-col gap-2 sm:flex-row">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6a665a]" />
						<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pips, funding, NFP, wallets, SMC, carry…" className="min-h-[44px] w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] pl-9 pr-3 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50" />
					</div>
					<div className="flex flex-wrap gap-2">
						{TRACKS.map((tr) => (
							<button key={tr.key} onClick={() => setTrack(tr.key)} className={`min-h-[44px] rounded-xl px-4 text-xs font-semibold transition ${track === tr.key ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'border border-[#d4af37]/20 text-[#8a8577] hover:text-[#e9e7df]'}`}>{tr.name}</button>
						))}
					</div>
				</div>
				<p className="mt-2 text-xs text-[#6a665a]">{filtered.length} topics {track !== 'all' ? `in ${track}` : 'across all paths'}{q ? ` matching “${q}”` : ''}</p>
			</div>

			{grouped.length === 0 && (
				<div className="glass rounded-2xl p-8 text-center text-sm text-[#8a8577]">No topics match. Try “leverage”, “funding”, “NFP” or “wallet”.</div>
			)}

			{grouped.map((g) => {
				const path = PATHS.find((p) => p.key === g.pathKey);
				return (
					<div key={`${g.pathKey}-${g.courseKey}`} className="glass rounded-2xl p-5">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: path?.color || '#d4af37' }}>
									<span>{g.pathName}</span><span className="text-[#6a665a]">·</span><span className="text-[#8a8577]">{g.courseTitle}</span>
								</div>
							</div>
							<button onClick={() => onStartPath(g.pathKey)} className="rounded-xl border border-[#d4af37]/25 px-3.5 py-2 text-xs font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10">Start this path</button>
						</div>
						<div className="mt-3 grid gap-2 sm:grid-cols-2">
							{g.items.map((lp) => (
								<button key={lp.lessonKey} onClick={() => onStartPath(g.pathKey)} className="group flex items-center gap-2.5 rounded-xl border border-[#d4af37]/10 p-3 text-left transition hover:border-[#d4af37]/40 hover:bg-[#d4af37]/[0.04]">
									<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d4af37]/10 text-[#d4af37]"><BookOpen className="h-3.5 w-3.5" /></span>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-[13px] font-medium text-[#f0ecdd]">{lp.title}</span>
										<span className="mt-0.5 flex items-center gap-2 text-[11px] text-[#8a8577]"><span className="flex items-center gap-1"><Timer className="h-3 w-3" />{lp.minutes} min</span><span>· {(lp.tags || []).join(' · ')}</span></span>
									</span>
									<ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6a665a] group-hover:text-[#d4af37]" />
								</button>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ── Main page ────────────────────────────────────────────────────────
export default function AcademyPage() {
	const { t } = useI18n();
	const { toast } = useToast();
	const { user } = useAuth();
	const isAdmin = user?.role === 'admin'; // admins enter free — everyone else pays $150
	const [access, setAccess] = useState(null); // null = loading
	const [data, setData] = useState(null);
	const [loadError, setLoadError] = useState(null); // 'access' | 'progress' | null
	const [view, setView] = useState('paths'); // paths | curriculum | lesson
	const [activePath, setActivePath] = useState(null);
	const [activeCourse, setActiveCourse] = useState(null);
	const [activeLesson, setActiveLesson] = useState(null);
	const [generating, setGenerating] = useState(null); // pathKey being generated
	const [rsvps, setRsvps] = useState([]);
	const [attended, setAttended] = useState([]);
	const [tab, setTab] = useState('learn');
	const [trackFilter, setTrackFilter] = useState('all');

	const topicIndex = useMemo(() => getTopicIndex(), []);
	const totals = useMemo(() => ({
		lessons: topicIndex.length,
		minutes: topicIndex.reduce((a, x) => a + (Number(x.minutes) || 0), 0),
		paths: PATHS.length,
	}), [topicIndex]);
	const forexCount = useMemo(() => topicIndex.filter((x) => (x.tags || []).includes('forex')).length, [topicIndex]);
	const cryptoCount = useMemo(() => topicIndex.filter((x) => (x.tags || []).includes('crypto')).length, [topicIndex]);

	const refreshAccess = useCallback(async () => {
		setLoadError(null);
		try {
			const res = await getAcademyAccess();
			setAccess(res.access);
			if (res.access) refreshProgress();
		} catch {
			setAccess(null);
			setLoadError('access');
		}
	}, []);

	const refreshProgress = useCallback(async () => {
		try {
			const res = await getAcademyProgress();
			setData(res);
			setRsvps(res.rsvps || []);
			setAttended(res.attended || []);
			setLoadError(null);
		} catch (err) {
			setLoadError('progress');
			toast({ variant: 'destructive', title: t('aca.loadFail'), description: err.message });
		}
	}, [toast]);

	useEffect(() => { refreshAccess(); }, [refreshAccess]);

	const progressMap = useMemo(() => {
		const map = {};
		(data?.progress || []).forEach((p) => { map[`${p.courseKey}:${p.lessonKey}`] = p; });
		return map;
	}, [data]);

	const enroll = async (path) => {
		setView('curriculum');
		setActivePath(path);
		setGenerating(path.key);
		try {
			await enrollInPath(path.key);
			await pollCurriculum(path);
		} catch (err) {
			toast({ variant: 'destructive', title: t('aca.enrollFail'), description: err.message });
			setGenerating(null);
		}
	};

	const startPathByKey = async (pathKey) => {
		const path = PATHS.find((p) => p.key === pathKey);
		if (!path) return;
		setTab('learn');
		await enroll(path);
	};

	const pollCurriculum = async (path, attempt = 0) => {
		try {
			const res = await getCurriculum(path.key, path.level);
			if (res.status === 'generating') {
				if (attempt > 40) { setGenerating(null); toast({ title: t('aca.stillWriting'), description: t('aca.stillWritingSub') }); return; }
				setTimeout(() => pollCurriculum(path, attempt + 1), 3000);
				return;
			}
			setGenerating(null);
			await refreshProgress();
		} catch (err) {
			setGenerating(null);
			toast({ variant: 'destructive', title: t('aca.curriculumFail'), description: err.message });
		}
	};

	const openLesson = (course, lesson) => {
		setActiveCourse(course);
		setActiveLesson(lesson);
		setView('lesson');
	};

	const curriculumFor = (pathKey) => data?.curricula?.find((c) => c.pathKey === pathKey)?.curriculum;
	const enrollmentFor = (pathKey) => data?.enrollments?.find((e) => e.pathKey === pathKey);

	const toggleRsvp = async (id) => {
		try {
			if (rsvps.includes(id)) {
				await unrsvpWebinar(id);
				setRsvps((prev) => prev.filter((x) => x !== id));
			} else {
				await rsvpWebinar(id);
				setRsvps((prev) => [...prev, id]);
			}
		} catch (err) {
			toast({ variant: 'destructive', title: t('aca.rsvpFail'), description: err.message });
		}
	};

	const doClaimCertificate = async (pathKey) => {
		try {
			await claimCertificate(pathKey);
			await refreshProgress();
			toast({ title: t('aca.certIssued'), description: t('aca.certIssuedSub') });
		} catch (err) {
			toast({ variant: 'destructive', title: t('aca.certFail'), description: err.message });
		}
	};

	const liveWebinars = WEBINAR_CATALOG.map((w) => ({ ...w, state: getWebinarState(w) }));
	const liveWebinar = liveWebinars.find((w) => w.state.live);
	const filteredWebinars = trackFilter === 'all' ? liveWebinars : liveWebinars.filter((w) => w.track === trackFilter || w.track === 'general');

	const filteredPaths = trackFilter === 'all' ? PATHS : PATHS.filter((p) => p.track === trackFilter || (trackFilter === 'general' && p.track === 'general'));

	useEffect(() => {
		if (!liveWebinar || attended.includes(liveWebinar.id)) return;
		attendWebinar(liveWebinar.id)
			.then(() => setAttended((prev) => (prev.includes(liveWebinar.id) ? prev : [...prev, liveWebinar.id])))
			.catch(() => {});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [liveWebinar?.id]);

	// ── Not purchased (and not admin) → paywall ──
	if (access === false && !isAdmin) {
		return (
			<AppLayout title={t('aca.page')}>
				<Paywall onPurchased={() => { toast({ title: t('aca.welcome'), description: t('aca.welcomeSub') }); refreshAccess(); }} />
				<div className="mt-6">
					<TopicExplorer onStartPath={() => { toast({ title: t('aca.badge'), description: 'Get lifetime access to unlock all paths and lessons.' }); }} />
				</div>
			</AppLayout>
		);
	}

	// ── Load failure → error panel with retry (never a stuck loader) ──
	if (loadError) {
		return (
			<AppLayout title={t('aca.page')}>
				<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
					<p className="text-sm text-[#c9c4b4]">{t('aca.loadFailRetry', null, 'Could not load your Academy. Check your connection, then try again.')}</p>
					<button
						onClick={() => { setLoadError(null); setAccess(null); setData(null); refreshAccess(); }}
						className="mt-5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-6 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"
					>
						{t('c.retry', null, 'Retry')}
					</button>
				</div>
			</AppLayout>
		);
	}

	if (access === null || !data) {
		return (
			<AppLayout title={t('aca.page')}>
				<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
					<Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
					<p className="mt-4 text-sm text-[#c9c4b4]">{t('aca.loading')}</p>
				</div>
			</AppLayout>
		);
	}

	const enrolled = data.enrollments || [];

	// ── Lesson view ──
	if (view === 'lesson' && activePath && activeCourse && activeLesson) {
		return (
			<AppLayout title={t('aca.page')}>
				<LessonView
					pathKey={activePath.key}
					curriculum={curriculumFor(activePath.key) || STATIC_CURRICULA[activePath.key] || { pathName: activePath.name, courses: [] }}
					course={activeCourse}
					lesson={activeLesson}
					progress={progressMap[`${activeCourse.courseKey}:${activeLesson.lessonKey}`]}
					onBack={() => { setView('curriculum'); setActiveCourse(null); setActiveLesson(null); }}
					onLessonDone={refreshProgress}
				/>
			</AppLayout>
		);
	}

	// ── Curriculum view ──
	if (view === 'curriculum' && activePath) {
		const aiCurriculum = curriculumFor(activePath.key);
		const staticFallback = STATIC_CURRICULA[activePath.key];
		const curriculum = aiCurriculum || staticFallback;
		const isPreview = !aiCurriculum && !!staticFallback;
		const certificate = enrollmentFor(activePath.key);
		return (
			<AppLayout title={t('aca.page')}>
				{!curriculum || generating === activePath.key && !curriculum ? (
					<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
						<div className="relative">
							<Route className="h-10 w-10 animate-pulse text-[#d4af37]" />
							<Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 animate-spin text-[#d4af37]" />
						</div>
						<p className="mt-4 font-semibold text-[#f0ecdd]">{t('aca.designing', { path: activePath.name })}</p>
						<p className="mt-1 max-w-md text-xs leading-relaxed text-[#6a665a]">{t('aca.designingSub')}</p>
					</div>
				) : (
					<CurriculumView
						pathKey={activePath.key}
						curriculum={curriculum}
						progressMap={progressMap}
						certificate={certificate}
						isPreview={isPreview || generating === activePath.key}
						onOpenLesson={openLesson}
						onLeave={() => { setView('paths'); setActivePath(null); }}
					/>
				)}
			</AppLayout>
		);
	}

	// ── Dashboard / portal ──
	return (
		<AppLayout title={t('aca.page')}>
			{/* Portal hero */}
			<div className="tint-hero mb-5 rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#d4af37]"><Sparkles className="h-4 w-4" /> AI-driven Forex + Crypto Academy</div>
						<h2 className="mt-1.5 text-xl font-bold text-[#f0ecdd] sm:text-2xl">Pick a desk, master every topic</h2>
						<p className="mt-1 max-w-2xl text-sm text-[#8a8577]">Your AI builds each path around you, writes every lesson, grades every quiz and tutors you 1-on-1 — from first pip and first satoshi to funded-desk execution.</p>
						<div className="mt-3 flex flex-wrap gap-2 text-xs">
							<span className="rounded-full bg-[#d4af37]/12 px-2.5 py-1 text-[#d4af37]">{totals.paths} paths</span>
							<span className="rounded-full bg-[#38bdf8]/10 px-2.5 py-1 text-[#38bdf8]">{forexCount} Forex topics</span>
							<span className="rounded-full bg-[#f472b6]/10 px-2.5 py-1 text-[#f472b6]">{cryptoCount} Crypto topics</span>
							<span className="rounded-full bg-[#34d399]/10 px-2.5 py-1 text-[#34d399]">{Math.round(totals.minutes / 60)}h+ content</span>
							<span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-400">8 live sessions / week</span>
						</div>
					</div>
					{enrolled.length > 0 && (
						<div className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14]/40 px-4 py-3 text-right backdrop-blur-xl">
							<p className="text-xs text-[#8a8577]">{t('aca.overall')}</p>
							<p className="mt-0.5 font-bold text-[#d4af37]">{(() => {
								let done = 0, total = 0;
								enrolled.forEach((e) => {
									const c = curriculumFor(e.pathKey) || STATIC_CURRICULA[e.pathKey];
									if (!c) return;
									total += c.courses.reduce((a, co) => a + co.lessons.length, 0);
									done += c.courses.reduce((a, co) => a + co.lessons.filter((l) => progressMap[`${co.courseKey}:${l.lessonKey}`]?.completed).length, 0);
								});
								return total ? `${Math.round((done / total) * 100)}%` : '0%';
							})()}</p>
						</div>
					)}
				</div>
				{/* Track filter */}
				<div className="mt-4 flex flex-wrap items-center gap-2">
					<Filter className="h-3.5 w-3.5 text-[#6a665a]" />
					{[{ key: 'all', name: 'All' }, ...TRACKS.filter((x) => x.key !== 'all')].map((tr) => (
						<button key={tr.key} onClick={() => setTrackFilter(tr.key)}
							className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${trackFilter === tr.key ? 'bg-[#d4af37] text-[#0a0a0f]' : 'border border-[#d4af37]/20 text-[#8a8577] hover:text-[#e9e7df]'}`}>
							{tr.name}
						</button>
					))}
				</div>
			</div>

			{/* Tabs */}
			<div className="mb-5 flex flex-wrap gap-2">
				{[
					{ id: 'learn', icon: GraduationCap, label: t('aca.tabLearn') },
					{ id: 'topics', icon: Library, label: 'Topics' },
					{ id: 'webinars', icon: Video, label: t('aca.tabWeb') },
					{ id: 'certificates', icon: Award, label: t('aca.tabCert') },
				].map((tb) => (
					<button key={tb.id} onClick={() => setTab(tb.id)}
						className={`frost-tab flex min-h-[42px] items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${tab === tb.id ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'border border-[#d4af37]/20 text-[#8a8577] hover:text-[#e9e7df]'}`}>
						<tb.icon className="h-4 w-4" /> {tb.label}
					</button>
				))}
			</div>

			{tab === 'learn' && (
				<>
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{filteredPaths.map((p) => {
							const isEnrolled = enrolled.some((e) => e.pathKey === p.key);
							const curriculum = curriculumFor(p.key) || STATIC_CURRICULA[p.key];
							const cert = enrollmentFor(p.key);
							const stats = pathStats(p.key);
							const lessons = curriculum?.courses.reduce((a, c) => a + c.lessons.length, 0) || stats.lessons || 0;
							const done = curriculum ? curriculum.courses.reduce((a, c) => a + c.lessons.filter((l) => progressMap[`${c.courseKey}:${l.lessonKey}`]?.completed).length, 0) : 0;
							const pct = lessons ? Math.round((done / lessons) * 100) : 0;
							const trackColor = TRACK_COLORS[p.track] || p.color;
							return (
								<div key={p.key} className="glass glass-hover relative flex h-full flex-col rounded-2xl p-5">
									<div className="flex items-center gap-2">
										<PathIcon icon={p.icon} color={p.color} />
										<span className="text-xs font-semibold uppercase tracking-wide" style={{ color: p.color }}>{p.level} path</span>
										<span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${trackColor}1a`, color: trackColor }}>{p.track}</span>
									</div>
									<h3 className="mt-2 font-semibold text-[#f0ecdd]">{p.name}</h3>
									<p className="mt-1 flex-1 text-sm leading-relaxed text-[#8a8577]">{p.desc}</p>
									<div className="mt-3 flex flex-wrap gap-1.5">
										{(p.skills || []).map((s) => (
											<span key={s} className="rounded-full border border-[#d4af37]/15 px-2 py-0.5 text-[11px] text-[#8a8577]">{s}</span>
										))}
									</div>
									<p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#6a665a]"><Layers className="h-3 w-3" />{stats.courses} courses · {stats.lessons} lessons · ~{Math.round(stats.minutes / 60)}h</p>
									{isEnrolled && lessons > 0 && (
										<div className="mt-2">
											<div className="flex justify-between text-[11px] text-[#8a8577]"><span>{done}/{lessons} lessons · {pct}%</span><span>{pct}%</span></div>
											<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#d4af37]/10"><div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25]" style={{ width: `${pct}%` }} /></div>
										</div>
									)}
									<div className="mt-4 flex items-center gap-2">
										{isEnrolled ? (
											<button onClick={() => { setActivePath(p); setView('curriculum'); }} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">
												{cert?.certificateCode ? <><BadgeCheck className="h-4 w-4" /> Certified</> : pct === 100 ? <><Award className="h-4 w-4" /> {t('aca.claimCert')}</> : <><PlayCircle className="h-4 w-4" /> {t('aca.continue')}</>}
											</button>
										) : (
											<button onClick={() => enroll(p)} disabled={generating === p.key}
												className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 px-4 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:opacity-50">
												{generating === p.key ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('aca.enrolling')}</> : <><Rocket className="h-4 w-4" /> {t('aca.enroll')}</>}
											</button>
										)}
									</div>
									{isEnrolled && !cert?.certificateCode && pct === 100 && (
										<button onClick={() => doClaimCertificate(p.key)} className="mt-2 min-h-[44px] w-full rounded-xl border border-[#d4af37]/25 px-4 text-sm font-semibold text-[#f4e6a8] transition hover:bg-[#d4af37]/10">{t('aca.claimAiCert')}</button>
									)}
								</div>
							);
						})}
					</div>
					{filteredPaths.length === 0 && (
						<div className="glass mt-4 rounded-2xl p-8 text-center text-sm text-[#8a8577]">No paths in this track. Switch the filter above.</div>
					)}

					{/* Forex vs Crypto quick jump */}
					<div className="mt-6 grid gap-4 md:grid-cols-2">
						<div className="rounded-2xl border border-[#38bdf8]/25 bg-gradient-to-br from-[#38bdf8]/[0.1] to-transparent p-5 backdrop-blur-xl">
							<div className="flex items-center gap-2 text-[#38bdf8]"><Globe className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wide">Forex desk</span></div>
							<p className="mt-2 text-sm leading-relaxed text-[#c9c4b4]">Majors → exotics, London & NY killzones, CPI/NFP news, SMC liquidity, carry & prop-firm funding. {forexCount} lessons.</p>
							<button onClick={() => startPathByKey('forex')} className="mt-3 min-h-[44px] rounded-xl bg-[#38bdf8] px-5 text-sm font-bold text-[#06222f] transition hover:opacity-90">Open Forex Mastery</button>
						</div>
						<div className="rounded-2xl border border-[#f472b6]/25 bg-gradient-to-br from-[#f472b6]/[0.1] to-transparent p-5 backdrop-blur-xl">
							<div className="flex items-center gap-2 text-[#f472b6]"><Bitcoin className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wide">Crypto desk</span></div>
							<p className="mt-2 text-sm leading-relaxed text-[#c9c4b4]">Wallets → spot → perps & funding → on-chain → DeFi → custody. Volatility sizing for 10% days. {cryptoCount} lessons.</p>
							<button onClick={() => startPathByKey('crypto')} className="mt-3 min-h-[44px] rounded-xl bg-[#f472b6] px-5 text-sm font-bold text-[#2f0618] transition hover:opacity-90">Open Crypto Mastery</button>
						</div>
					</div>
				</>
			)}

			{tab === 'topics' && (
				<TopicExplorer onStartPath={startPathByKey} />
			)}

			{tab === 'webinars' && (
				<div className="space-y-5">
					<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#d4af37]"><Radio className="h-4 w-4" /> {t('aca.liveInteractive')}</div>
						<h2 className="mt-1.5 text-xl font-bold text-[#f0ecdd] sm:text-2xl">{t('aca.webTitle')}</h2>
						<p className="mt-1 max-w-xl text-sm text-[#8a8577]">{t('aca.webSub')} Now with dedicated Forex and Crypto desks.</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{[{ key: 'all', name: 'All desks' }, { key: 'forex', name: 'Forex' }, { key: 'crypto', name: 'Crypto' }, { key: 'general', name: 'General' }, { key: 'pro', name: 'Pro' }].map((tr) => (
								<button key={tr.key} onClick={() => setTrackFilter(tr.key)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${trackFilter === tr.key ? 'bg-[#d4af37] text-[#0a0a0f]' : 'border border-[#d4af37]/20 text-[#8a8577]'}`}>{tr.name}</button>
							))}
						</div>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						{filteredWebinars.map((w) => {
							const { live, start } = w.state;
							const rsvped = rsvps.includes(w.id);
							const wColor = TRACK_COLORS[w.track] || '#d4af37';
							return (
								<div key={w.id} className={`glass h-full rounded-2xl p-5 ${live ? 'border border-[#34d399]/30' : ''}`}>
									<div className="flex flex-wrap items-center gap-2">
										{live
											? <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> {t('aca.liveNow')}</span>
											: <span className="rounded-full bg-[#d4af37]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#d4af37]">{WEEKDAYS[w.day]} · {w.hour % 12 || 12}:00 {w.hour >= 12 ? 'PM' : 'AM'} EST</span>}
										<span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${wColor}1a`, color: wColor }}>{w.track}</span>
									</div>
									<h3 className="mt-2.5 font-semibold text-[#f0ecdd]">{w.title}</h3>
									<p className="mt-1 text-xs text-[#8a8577]">{w.host}</p>
									<p className="mt-2 text-sm leading-relaxed text-[#c9c4b4]">{w.description}</p>
									<div className="mt-3 flex items-center gap-2 text-xs text-[#8a8577]">
										{live ? <span className="flex items-center gap-1 text-emerald-400"><Radio className="h-3.5 w-3.5" /> {t('aca.inProgress')}</span>
											: <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t('aca.startsIn', { cd: fmtCountdown(start, t) })}</span>}
										{attended.includes(w.id) && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">{t('aca.attended')}</span>}
									</div>
									<button onClick={() => toggleRsvp(w.id)}
										className={`mt-4 min-h-[42px] w-full rounded-xl border px-4 text-sm font-semibold transition ${rsvped ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' : 'border-[#d4af37]/25 text-[#d4af37] hover:bg-[#d4af37]/10'}`}>
										{rsvped ? <><CheckCircle2 className="mr-1.5 inline h-4 w-4" /> {t('aca.onList')}</> : t('aca.rsvp')}
									</button>
								</div>
							);
						})}
					</div>

					{filteredWebinars.find((w) => w.state.live) ? (
						<div>
							<h3 className="mb-3 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Radio className="h-5 w-5 text-emerald-400" /> {t('aca.liveRoom')}</h3>
							<AIChat
								endpoint="/academy/webinar/stream"
								placeholder={t('aca.hostPh')}
								accent="#34d399"
								buildBody={({ history, question }) => ({
									webinar: filteredWebinars.find((w) => w.state.live),
									scheduleNote: 'LIVE session — attendees are joining now.',
									history,
									question,
								})}
							/>
						</div>
					) : (
						<div className="glass flex items-center gap-3 rounded-2xl p-5">
							<Calendar className="h-6 w-6 text-[#d4af37]" />
							<p className="text-sm text-[#c9c4b4]">{t('aca.nextSession', { cd: fmtCountdown(filteredWebinars.reduce((a, w) => (w.state.start.getTime() < a.state.start.getTime() ? w : a)).state.start, t) })}</p>
						</div>
					)}
				</div>
			)}

			{tab === 'certificates' && (
				<div className="space-y-4">
					<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
						<h2 className="text-xl font-bold text-[#f0ecdd] sm:text-2xl"><Award className="mr-2 inline h-6 w-6 text-[#d4af37]" />{t('aca.yourCerts')}</h2>
						<p className="mt-1 max-w-xl text-sm text-[#8a8577]">{t('aca.yourCertsSub')} Earn one per path — including Forex Mastery and Crypto Mastery.</p>
					</div>
					{enrolled.length === 0 ? (
						<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
							<Award className="h-10 w-10 text-[#6a665a]" />
							<p className="mt-3 text-sm text-[#c9c4b4]">{t('aca.enrollSub')}</p>
						</div>
					) : enrolled.map((e) => {
						const p = PATHS.find((x) => x.key === e.pathKey);
						const curriculum = curriculumFor(e.pathKey) || STATIC_CURRICULA[e.pathKey];
						const lessons = curriculum?.courses.reduce((a, c) => a + c.lessons.length, 0) || 0;
						const done = curriculum ? curriculum.courses.reduce((a, c) => a + c.lessons.filter((l) => progressMap[`${c.courseKey}:${l.lessonKey}`]?.completed).length, 0) : 0;
						const pct = lessons ? Math.round((done / lessons) * 100) : 0;
						return (
							<div key={e.pathKey} className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
								<div className="flex items-center gap-3">
									<div className="grid h-11 w-11 place-items-center rounded-full bg-[#d4af37]/12 text-[#d4af37]">{e.certificateCode ? <Trophy className="h-5 w-5" /> : <Lock className="h-5 w-5" />}</div>
									<div>
										<p className="font-semibold text-[#f0ecdd]">{p?.name || e.pathKey}</p>
										<p className="text-xs text-[#8a8577]">{e.certificateCode ? <span>{t('aca.codePf')} <span className="font-mono text-[#d4af37]">{e.certificateCode}</span> · {new Date(e.certificateGeneratedAt).toLocaleDateString()}</span> : t('aca.lessonsN', { d: done, n: lessons })}</p>
									</div>
								</div>
								{e.certificateCode
									? <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-400"><BadgeCheck className="h-4 w-4" /> Certified</span>
									: <button onClick={() => doClaimCertificate(e.pathKey)} disabled={pct < 100}
										className="min-h-[42px] rounded-xl border border-[#d4af37]/25 px-4 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:cursor-not-allowed disabled:opacity-40">
										{pct < 100 ? t('aca.completeMore', { p: 100 - pct }) : t('aca.claimCert')}
									</button>}
							</div>
						);
					})}
				</div>
			)}

			<div className="tint-hero mt-8 flex flex-col items-center rounded-2xl border border-[#d4af37]/15 p-6 text-center sm:flex-row sm:justify-between sm:p-8 sm:text-left">
				<div className="flex items-center gap-4">
					<Bot className="h-10 w-10 shrink-0 text-[#d4af37]" />
					<div>
						<h3 className="font-semibold text-[#f0ecdd]">{t('aca.aiRuns')}</h3>
						<p className="text-sm text-[#8a8577]">{t('aca.aiRunsSub')}</p>
					</div>
				</div>
				<button onClick={() => setTab('learn')} className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-3 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 sm:mt-0"><MessageSquare className="h-4 w-4" /> {t('aca.startLearning')}</button>
			</div>
		</AppLayout>
	);
}
