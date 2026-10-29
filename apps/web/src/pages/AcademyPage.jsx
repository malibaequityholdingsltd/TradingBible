import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	PlayCircle, Clock, CheckCircle2, Lock, GraduationCap, Video, Route, Award, Sparkles,
	Rocket, BookOpen, Bot, ArrowLeft, RotateCcw, ChevronRight, Trophy, Calendar, Radio, Loader2,
	MessageSquare, Send, BadgeCheck, CircleDollarSign, Wallet, Search, Globe, Bitcoin,
	Sprout, Zap, Briefcase, Layers, Filter, Timer, Library,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import AcademyListen from '@/components/AcademyListen';
import { Card, EmptyState, GhostButton, GoldButton, PageHero } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { openAcademyCheckout, getStripeConfig } from '@/lib/stripe';
import { useWallet } from '@/hooks/useWallet';
import {
	getAcademyAccess, enrollInPath, getCurriculum, getLesson,
	getAcademyExam, gradeAcademyExam,
	completeLesson, getAcademyProgress, claimCertificate, rsvpWebinar, unrsvpWebinar, attendWebinar,
} from '@/lib/academy';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { PATHS, STATIC_CURRICULA, WEBINAR_CATALOG, TRACKS, getTopicIndex, pathStats } from '@/lib/academyCatalog';
import '@/styles/academy-studio.css';

// ── Path icon map ────────────────────────────────────────────────────
const PATH_ICONS = { sprout: Sprout, globe: Globe, bitcoin: Bitcoin, zap: Zap, briefcase: Briefcase, layers: Layers };
const TRACK_COLORS = { general: '#34d399', forex: '#38bdf8', crypto: '#f472b6', orderflow: '#a78bfa', pro: '#d4af37' };
function PathIcon({ icon, color }) {
	const C = PATH_ICONS[icon] || Route;
	return <C className="h-5 w-5" style={{ color }} />;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TZ = 'America/New_York';

const EXAM_COURSE = '__final-exam';
const EXAM_LESSON = 'certificate';
const EXAM_PASS_PERCENT = 80;

function flattenLessons(curriculum) {
	return (curriculum?.courses || []).flatMap((course) => (course.lessons || []).map((lesson) => ({ course, lesson })));
}

function examForPath(progress, pathKey) {
	return (progress || []).find((p) => p.pathKey === pathKey && p.courseKey === EXAM_COURSE && p.lessonKey === EXAM_LESSON) || null;
}

function examPercent(exam) {
	const total = Number(exam?.quizTotal) || 0;
	const score = Number(exam?.quizScore) || 0;
	return total ? Math.round((score / total) * 100) : 0;
}

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
			if (/^[-*_]{3,}$/.test(line.trim())) { flushList(); out.push(<hr key={out.length} className="ac-rule" />); continue; }
			flushList();
			out.push(<p key={out.length} className="my-2 text-sm leading-relaxed text-[#c9c4b4]" dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />);
		}
		flushList();
		return out;
	}, [text]);
	return <div>{blocks}</div>;
}

// ── Generic SSE chat (SI Tutor + Webinar SI host) ────────────────────
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
				throw new Error(body?.error?.message || 'The SI could not respond right now.');
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
	const tbcBalance = ledger?.balances?.TBC || 0;
	// 1 TBC = 1 KWD, NOT 1 USD — $150 list converts at KWD peg (default 150/3.25 ≈ 46.15 TBC)
	const [tbcPerUsd, setTbcPerUsd] = useState(1 / 3.25);
	const tbcPrice = Math.round(150 * tbcPerUsd * 100) / 100;

	useEffect(() => {
		getStripeConfig().then((cfg) => {
			setConfigured(Boolean(cfg?.prices?.academy));
		}).catch(() => {}).finally(() => setChecked(true));
	}, []);
	useEffect(() => {
		fetch(`${API_SERVER_URL}/tbc/econ`).then((r) => r.json()).then((e) => {
			const rt = Number(e?.tbcPerUsd);
			if (rt > 0.15 && rt < 0.6) setTbcPerUsd(rt); // 1 TBC = 1 KWD — reject 1:1
			else if (Number(e?.usdPerKwd) >= 2 && Number(e?.usdPerKwd) <= 5) setTbcPerUsd(1 / Number(e.usdPerKwd));
		}).catch(() => {});
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
		{ icon: Video, text: '8 live webinars / week with an SI host — FX London lab, crypto on-chain lab, news reactions' },
		{ icon: Bot, text: 'One-on-one SI tutor inside every lesson' },
		{ icon: Trophy, text: 'Learn without pop quizzes — pass one final certificate exam per path' },
		{ icon: Award, text: 'Lifetime access — one payment, forever' },
	];

	return (
		<PageHero
			kicker={t('aca.badge')}
			kickerIcon={GraduationCap}
			title={t('aca.titleA')}
			accent={`${t('aca.titleB')} ${t('aca.titleC')}`}
			subtitle={t('aca.sub')}
		>
			<div className="flex flex-col items-center text-center">
				<div className="mt-4 flex flex-wrap justify-center gap-2">
					{['Forex: pairs → prop firms', 'Crypto: wallets → perps → on-chain', 'Risk, psychology & playbooks'].map((s) => (
						<span key={s} className="rounded-full border border-[#d4af37]/20 px-3 py-1 text-xs text-[#c9c4b4] backdrop-blur-md">{s}</span>
					))}
				</div>

				<div className="mt-6 flex items-end gap-1.5">
					<span className="tb-gold-text text-5xl font-bold">₮{tbcPrice.toLocaleString()}</span>
					<span className="mb-1.5 text-sm text-[#8a8577]">$150 list · {t('aca.priceNote')}</span>
				</div>

				<div className="mt-6 flex flex-col items-center gap-3">
					<GoldButton
						onClick={buy}
						disabled={busy || (checked && !configured)}
						className="min-h-[52px] px-8 text-base disabled:opacity-60"
					>
						{busy ? <><Loader2 className="h-5 w-5 animate-spin" /> {t('aca.opening')}</> : <><CircleDollarSign className="h-5 w-5" /> {t('aca.cta')}</>}
					</GoldButton>
					<GhostButton onClick={buyWithWallet} disabled={busy || tbcBalance < tbcPrice} className="disabled:opacity-40">
						<Wallet className="h-4 w-4" /> {t('aca.walletPay')} — pay {tbcPrice.toLocaleString()} TBC in TBC ({tbcBalance >= tbcPrice ? t('aca.available') : t('aca.needMore', { amt: `${(tbcPrice - tbcBalance).toFixed(2)} TBC` })})
					</GhostButton>
					<div className="text-xs text-[#8a8577]">{tbcBalance.toLocaleString()} TBC in till · <Link to="/app/wallet" className="text-[#d4af37] hover:underline">{t('bill.fundWallet')} — convert, swap, buy or receive TBC</Link></div>
				</div>
			<p className="mt-3 text-xs text-[#6a665a]">{t('aca.guarantee')}</p>
			</div>

			<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{features.map((f) => (
					<Card key={f.text} className="flex items-start gap-3 rounded-xl p-4">
						<f.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" />
						<span className="text-sm text-[#c9c4b4]">{f.text}</span>
					</Card>
				))}
			</div>
		</PageHero>
	);
}

function LessonLoading() {
	const { t } = useI18n();
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
		return () => window.clearInterval(timer);
	}, []);
	const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	return (
		<div className="ac-state ac-state-loading" aria-live="polite">
			<Loader2 className="h-7 w-7 animate-spin" />
			<strong>{t('aca.writing')}</strong>
			<p>{t('aca.writingSub2', null, 'First time only. The SI writes and saves this lesson for you — usually 1–2 minutes on this server. It opens instantly next time.')}</p>
			<div className="ac-loading-bar" aria-hidden="true"><span /></div>
			<p className="ac-loading-elapsed">{t('aca.writingElapsed', { time: clock }, `Elapsed ${clock} · first read only`)}</p>
			<p className="ac-loading-keep">{t('aca.writingKeep', null, 'You can switch tabs while it writes. The lesson is saved when it is ready.')}</p>
		</div>
	);
}

// ── Lesson view (learning experience + tutor) ───────────────────────
function LessonView({
	pathKey, curriculum, course, lesson, progress,
	lessonNumber, totalLessons, pathDone, nextLesson, nextLessonCourseKey,
	onBack, onLessonDone, onNext, onTakeExam,
}) {
	const { t } = useI18n();
	const [state, setState] = useState({ status: 'loading', content: null, error: '' });
	const [done, setDone] = useState(!!progress?.completed);
	const { toast } = useToast();

	useEffect(() => { document.title = `${lesson.title} · ${t('aca.page')}`; }, [lesson.title, t]);
	useEffect(() => { setDone(!!progress?.completed); }, [progress?.completed, lesson.lessonKey]);

	const load = useCallback(() => {
		setState({ status: 'loading', content: null, error: '' });
		getLesson(pathKey, course.courseKey, lesson.lessonKey)
			.then((res) => setState({ status: 'ready', content: res.content }))
			.catch((err) => setState({ status: 'error', content: null, error: err.message }));
	}, [pathKey, course.courseKey, lesson.lessonKey]);

	useEffect(() => { load(); }, [load]);

	// Once the current lesson is readable, warm the next lesson while the
	// student is reading. The server shares one generation with an active
	// request, so clicking Continue never starts a duplicate CPU job.
	useEffect(() => {
		if (state.status !== 'ready' || !nextLesson || !nextLessonCourseKey) return undefined;
		const timer = window.setTimeout(() => {
			if (document.visibilityState !== 'visible') return;
			getLesson(pathKey, nextLessonCourseKey, nextLesson.lessonKey).catch(() => {});
		}, 5000);
		return () => window.clearTimeout(timer);
	}, [state.status, pathKey, nextLessonCourseKey, nextLesson]);

	const willFinishPath = pathDone + 1 >= totalLessons;

	const markDone = async () => {
		try {
			await completeLesson(pathKey, course.courseKey, lesson.lessonKey);
			setDone(true);
			onLessonDone();
			toast({
				title: t('aca.lessonDone'),
				description: nextLesson ? t('aca.lessonDoneSub') : willFinishPath ? t('aca.pathDoneExamSub', null, 'Path complete. Your final certificate exam is ready.') : t('aca.lessonDoneSub'),
			});
		} catch (err) {
			toast({ variant: 'destructive', title: t('aca.saveFail'), description: err.message });
		}
	};

	if (state.status === 'loading') {
		return <LessonLoading />;
	}

	if (state.status === 'error') {
		return (
			<div className="ac-state">
				<BookOpen className="h-7 w-7" />
				<strong>This lesson could not open.</strong>
				<p>{state.error}</p>
				<button type="button" className="ac-btn ac-btn-ghost" onClick={load}><RotateCcw className="h-4 w-4" /> {t('aca.tryAgain')}</button>
			</div>
		);
	}

	const { content } = state;
	const keyPoints = Array.isArray(content.keyPoints)
		? content.keyPoints
			.map((point) => String(point || '').trim())
			.filter((point) => /[\p{L}\p{N}]/u.test(point))
		: [];
	const pathPct = totalLessons ? Math.round((pathDone / totalLessons) * 100) : 0;

	return (
		<>
		<div className="ac-lesson-layout">
			<div className="ac-lesson-main">
				<header className="ac-lesson-head">
					<div className="ac-lesson-head-top">
						<button type="button" className="ac-back" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> {t('aca.backTo', { path: curriculum.pathName })}</button>
						<span className="ac-lesson-panel-meta">{t('aca.lessonNofM', { n: lessonNumber || 1, total: totalLessons || 1 })}</span>
					</div>
					<span className="ac-eyebrow" style={{ marginTop: 18 }}>{course.title}</span>
					<h1 className="ac-lesson-title">{content.title}</h1>
					<p className="ac-lesson-summary">{content.summary}</p>
					<div className="ac-lesson-meta">
						<span><Clock className="h-3.5 w-3.5" /> {t('aca.minutes', { n: lesson.minutes })}</span>
						<span>No quiz inside this lesson</span>
						{done && <span className="is-done"><CheckCircle2 className="h-3.5 w-3.5" /> {t('aca.completed')}</span>}
					</div>
					<AcademyListen
						pathKey={pathKey}
						courseKey={course.courseKey}
						lessonKey={lesson.lessonKey}
						content={content}
					/>
					{keyPoints.length > 0 && (
						<div className="ac-objectives">
							<span className="ac-section-kicker">What you will master</span>
							{keyPoints.map((point, i) => (
								<p key={i} className="ac-objective"><CheckCircle2 className="h-3.5 w-3.5" /> {point}</p>
							))}
						</div>
					)}
				</header>

				<article className="ac-article" aria-label="Lesson notes">
					<Markdown text={content.content} />
				</article>

				<div className="ac-callout">
					<Sparkles className="h-4 w-4" />
					<div>
						<strong>{t('aca.oneThing', null, 'The one thing to remember')}</strong>
						<p>{content.summary}</p>
					</div>
				</div>
			</div>

			<aside className="ac-lesson-side">
				<div className="ac-side-card">
					<div className="ac-side-card-head">Path progress</div>
					<div className="ac-side-progress">
						<div className="ac-ring" style={{ '--ac-pct': `${pathPct}%` }}>
							<div className="ac-ring-inner"><strong>{pathPct}%</strong></div>
						</div>
						<div><strong>{pathDone} / {totalLessons}</strong><span>lessons complete</span></div>
					</div>
					{!done ? (
						<button type="button" className="ac-btn ac-btn-gold" onClick={markDone}><CheckCircle2 className="h-4 w-4" /> {t('aca.markDone')}</button>
					) : nextLesson ? (
						<button type="button" className="ac-btn ac-btn-gold" onClick={onNext}><ChevronRight className="h-4 w-4" /> {t('aca.continueNext', null, 'Continue to next lesson')}</button>
					) : willFinishPath ? (
						<button type="button" className="ac-btn ac-btn-gold" onClick={onTakeExam}><Award className="h-4 w-4" /> {t('aca.startFinalExam', null, 'Take the final exam')}</button>
					) : (
						<button type="button" className="ac-btn ac-btn-gold" onClick={onBack}><BookOpen className="h-4 w-4" /> {t('aca.finishMissingLessons', null, 'Finish the remaining lessons')}</button>
					)}
					<p className="ac-side-note">Read and explore at your own pace. The final certificate exam comes after the full path — there are no questions in the lesson.</p>
				</div>

				{nextLesson && (
					<div className="ac-next-card">
						<span>Next lesson</span>
						<strong>{nextLesson.title}</strong>
						<button type="button" className="ac-link-btn" onClick={onNext}>Continue <ChevronRight className="h-3.5 w-3.5" /></button>
					</div>
				)}

				<div className="ac-next-card">
					<span>Course</span>
					<strong>{course.title}</strong>
					<button type="button" className="ac-link-btn" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Back to path</button>
				</div>
			</aside>
		</div>

		<div className="ac-tutor ac-tutor-wide">
			<div className="ac-tutor-head"><Bot className="h-4 w-4" /><strong>{t('aca.tutorTitle')}</strong><span>Ask about this lesson</span></div>
			<AIChat
				endpoint="/academy/tutor/stream"
				placeholder={t('aca.tutorPh')}
				buildBody={({ history, question }) => ({ pathKey, courseKey: course.courseKey, lessonKey: lesson.lessonKey, history, question })}
			/>
		</div>
		</>
	);
}

// ── Final certificate exam ───────────────────────────────────────────
function FinalExamView({ pathKey, pathName, certificate, onBack, onPassed, onClaimCertificate }) {
	const { t } = useI18n();
	const { toast } = useToast();
	const [state, setState] = useState({ status: 'loading', data: null, error: '' });
	const [phase, setPhase] = useState('intro');
	const [index, setIndex] = useState(0);
	const [answers, setAnswers] = useState({});
	const [result, setResult] = useState(null);
	const [submitting, setSubmitting] = useState(false);
	const [claiming, setClaiming] = useState(false);

	const load = useCallback(() => {
		setState({ status: 'loading', data: null, error: '' });
		getAcademyExam(pathKey)
			.then((data) => {
				setState({ status: 'ready', data, error: '' });
				if (data.passed) {
					setResult({
						score: data.score, total: data.total, percent: data.percent,
						passed: true, feedback: t('aca.examAlreadyPassed', null, 'You have already passed this exam.'),
					});
				}
			})
			.catch((err) => setState({ status: 'error', data: null, error: err.message }));
	}, [pathKey, t]);

	useEffect(() => { load(); }, [load]);

	const begin = () => {
		setAnswers({});
		setIndex(0);
		setResult(null);
		setPhase('questions');
	};

	const submit = async () => {
		const questions = state.data?.questions || [];
		if (Object.keys(answers).length < questions.length) {
			toast({ title: t('aca.answerAll'), description: t('aca.answerAllSub') });
			return;
		}
		setSubmitting(true);
		try {
			const res = await gradeAcademyExam(pathKey, answers);
			setResult(res);
			setPhase('result');
			onPassed?.();
			if (res.passed) toast({ title: t('aca.examPassedTitle', null, 'Exam passed'), description: res.feedback });
		} catch (err) {
			toast({ variant: 'destructive', title: t('aca.examFailTitle', null, 'Could not submit exam'), description: err.message });
		} finally { setSubmitting(false); }
	};

	const claim = async () => {
		setClaiming(true);
		try {
			await onClaimCertificate?.();
		} finally { setClaiming(false); }
	};

	if (state.status === 'loading') {
		return (
			<div className="ac-state">
				<Loader2 className="h-7 w-7 animate-spin" />
				<strong>{t('aca.examLoading', null, 'Preparing your certificate exam…')}</strong>
				<p>The exam is drawn from the path you have completed. Nothing is timed.</p>
			</div>
		);
	}

	if (state.status === 'error') {
		return (
			<div className="ac-exam">
				<button type="button" className="ac-back" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> {t('aca.backToPath', null, 'Back to path')}</button>
				<div className="ac-state">
					<Lock className="h-7 w-7" />
					<strong>The exam is not available yet.</strong>
					<p>{state.error}</p>
					<button type="button" className="ac-btn ac-btn-ghost" onClick={load}><RotateCcw className="h-4 w-4" /> {t('aca.tryAgain')}</button>
				</div>
			</div>
		);
	}

	const data = state.data;
	const questions = data.questions || [];
	const current = questions[index];
	const examPct = result?.percent ?? data.percent ?? 0;
	const passed = !!result?.passed || !!data.passed;
	const hasCertificate = !!certificate?.certificateCode;

	return (
		<div className="ac-exam">
			<button type="button" className="ac-back" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> {t('aca.backToPath', null, 'Back to path')}</button>

			<header className="ac-exam-hero">
				<div>
					<span className="ac-eyebrow">{t('aca.certificateExam', null, 'Certificate exam')}</span>
					<h1 className="ac-title">{pathName}</h1>
					<p className="ac-lede">{t('aca.finalExamSub', null, 'No questions while you learn. This final exam is the only test between you and your certificate.')}</p>
					<div className="ac-path-hero-meta">
						<span>{t('aca.examQuestionsN', { n: questions.length }, `${questions.length} questions`)}</span>
						<span>{t('aca.examPassMark', { n: data.passMark }, `${data.passMark}% to pass`)}</span>
						<span>{t('aca.examNoTimer', null, 'No timer — think it through')}</span>
					</div>
				</div>
				<span className="ac-seal"><Award className="h-5 w-5" /></span>
			</header>

			{phase === 'intro' && (
				<div className="ac-exam-card">
					{passed ? (
						<>
							<div className="ac-result">
								<span className="ac-result-icon is-green"><BadgeCheck className="h-5 w-5" /></span>
								<div>
									<h3>{t('aca.examPassedTitle', null, 'Exam passed')}</h3>
									<p>{t('aca.examPassedLine', { s: result?.score ?? data.score, n: result?.total ?? data.total, p: examPct }, `You scored ${result?.score ?? data.score}/${result?.total ?? data.total} (${examPct}%).`)}</p>
								</div>
							</div>
							{result?.feedback && <p className="ac-result-note">{result.feedback}</p>}
							<div className="ac-exam-actions">
								{hasCertificate ? (
									<span className="ac-status-note is-green"><Trophy className="h-4 w-4" /> {t('aca.certifiedBadge')}</span>
								) : (
									<button type="button" className="ac-btn ac-btn-gold" onClick={claim} disabled={claiming}>
										{claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} {t('aca.claimCert')}
									</button>
								)}
								<button type="button" className="ac-btn ac-btn-ghost" onClick={onBack}>{t('aca.backToPath', null, 'Back to path')}</button>
							</div>
							{hasCertificate && <p className="ac-result-note" style={{ fontFamily: 'var(--ac-mono)', color: 'var(--ac-gold)' }}>{certificate.certificateCode}</p>}
						</>
					) : (
						<>
							<div className="ac-result">
								<span className="ac-result-icon"><Award className="h-5 w-5" /></span>
								<div>
									<h3>{t('aca.examReadyTitle', null, 'You finished the lessons. Now show what you know.')}</h3>
									<p>{t('aca.examReadySub', null, 'The questions below are the certificate exam. There are no quizzes inside the lessons — this is your one focused test.')}</p>
								</div>
							</div>
							<div className="ac-exam-stats">
								<div className="ac-exam-stat"><span>{t('aca.examQuestions', null, 'Questions')}</span><strong>{questions.length}</strong></div>
								<div className="ac-exam-stat"><span>{t('aca.examPassMarkLabel', null, 'Pass mark')}</span><strong className="is-gold">{data.passMark}%</strong></div>
								<div className="ac-exam-stat"><span>{t('aca.examCoverage', null, 'Coverage')}</span><strong style={{ fontFamily: 'var(--ac-sans)', fontSize: 12, lineHeight: 1.3 }}>{t('aca.examCoverageValue', null, 'The full path')}</strong></div>
							</div>
							<p className="ac-result-note">{t('aca.examBeforeStart', null, 'Answer every question. You can move back and change answers before submitting. If you do not pass, you can retake the exam after reviewing the lessons.')}</p>
							<div className="ac-exam-actions">
								<button type="button" className="ac-btn ac-btn-gold" onClick={begin}><PlayCircle className="h-4 w-4" /> {t('aca.startFinalExam', null, 'Start final exam')}</button>
								<button type="button" className="ac-btn ac-btn-ghost" onClick={onBack}>{t('aca.reviewLessons', null, 'Review lessons')}</button>
							</div>
						</>
					)}
				</div>
			)}

			{phase === 'questions' && current && (
				<div className="ac-exam-card">
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
						<span className="ac-section-kicker" style={{ marginBottom: 0 }}>{t('aca.examQuestionN', { n: index + 1, total: questions.length }, `Question ${index + 1} of ${questions.length}`)}</span>
						<span className="ac-lesson-panel-meta">{Math.round(((index + 1) / questions.length) * 100)}%</span>
					</div>
					<div className="ac-exam-progress"><div style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
					{current.lessonTitle && <p style={{ marginTop: 17, marginBottom: 0, color: 'var(--ac-faint)', fontFamily: 'var(--ac-mono)', fontSize: 9, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{current.courseTitle} · {current.lessonTitle}</p>}
					<h3 style={{ marginTop: 9 }}>{current.question}</h3>
					<div className="ac-exam-options">
						{current.options.map((opt, oi) => (
							<button
								key={oi}
								type="button"
								aria-label={`${String.fromCharCode(65 + oi)}. ${opt}`}
								aria-pressed={answers[current.id] === oi}
								onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: oi }))}
								className={`ac-exam-option ${answers[current.id] === oi ? 'is-selected' : ''}`}
							>
								<span className="ac-exam-option-key">{String.fromCharCode(65 + oi)}</span>
								<span>{opt}</span>
							</button>
						))}
					</div>
					<div className="ac-exam-actions">
						<button type="button" className="ac-btn ac-btn-ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}><ArrowLeft className="h-4 w-4" /> {t('aca.examBack', null, 'Back')}</button>
						{index < questions.length - 1 ? (
							<button type="button" className="ac-btn ac-btn-gold" onClick={() => setIndex((i) => i + 1)} disabled={answers[current.id] === undefined}>{t('aca.examNext', null, 'Next question')} <ChevronRight className="h-4 w-4" /></button>
						) : (
							<button type="button" className="ac-btn ac-btn-gold" onClick={submit} disabled={submitting || answers[current.id] === undefined}>
								{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t('aca.examSubmit', null, 'Submit exam')}
							</button>
						)}
					</div>
				</div>
			)}

			{phase === 'result' && result && !result.passed && (
				<div className="ac-exam-card">
					<div className="ac-result">
						<span className="ac-result-icon"><RotateCcw className="h-5 w-5" /></span>
						<div>
							<h3>{t('aca.examNotYet', null, 'Not quite yet — review and retry')}</h3>
							<p>{t('aca.examResultLine', { s: result.score, n: result.total, p: result.percent }, `You scored ${result.score}/${result.total} (${result.percent}%).`)}</p>
						</div>
					</div>
					<p className="ac-result-note">{result.feedback}</p>
					<div className="ac-exam-actions">
						<button type="button" className="ac-btn ac-btn-gold" onClick={begin}><RotateCcw className="h-4 w-4" /> {t('aca.retakeExam', null, 'Retake exam')}</button>
						<button type="button" className="ac-btn ac-btn-ghost" onClick={onBack}>{t('aca.reviewLessons', null, 'Review lessons')}</button>
					</div>
				</div>
			)}

			{phase === 'result' && result?.passed && (
				<div className="ac-exam-card">
					<div className="ac-result">
						<span className="ac-result-icon is-green"><BadgeCheck className="h-5 w-5" /></span>
						<div>
							<h3>{t('aca.examPassedTitle', null, 'Exam passed')}</h3>
							<p>{t('aca.examResultLine', { s: result.score, n: result.total, p: result.percent }, `You scored ${result.score}/${result.total} (${result.percent}%).`)}</p>
						</div>
					</div>
					<p className="ac-result-note">{result.feedback}</p>
					<div className="ac-exam-actions">
						{hasCertificate ? (
							<span className="ac-status-note is-green"><Trophy className="h-4 w-4" /> {t('aca.certifiedBadge')}</span>
						) : (
							<button type="button" className="ac-btn ac-btn-gold" onClick={claim} disabled={claiming}>
								{claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} {t('aca.claimCert')}
							</button>
						)}
						<button type="button" className="ac-btn ac-btn-ghost" onClick={onBack}>{t('aca.backToPath', null, 'Back to path')}</button>
					</div>
				</div>
			)}
		</div>
	);
}

// ── Curriculum (enrolled path) ───────────────────────────────────────
function CurriculumView({ pathKey, curriculum, progressMap, onOpenLesson, onLeave, certificate, isPreview, exam, onOpenExam, onClaimCertificate }) {
	const { t } = useI18n();
	const [courseIndex, setCourseIndex] = useState(0);
	const courses = curriculum.courses || [];
	const totalLessons = courses.reduce((a, c) => a + c.lessons.length, 0);
	const completed = courses.reduce((a, c) => a + c.lessons.filter((l) => progressMap[`${c.courseKey}:${l.lessonKey}`]?.completed).length, 0);
	const pct = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;
	const allDone = totalLessons > 0 && completed >= totalLessons;
	const examPct = examPercent(exam);
	const examPassed = examPct >= EXAM_PASS_PERCENT;
	const safeCourseIndex = Math.min(courseIndex, Math.max(0, courses.length - 1));
	const course = courses[safeCourseIndex];
	const totalMinutes = courses.reduce((a, c) => a + (Number(c.minutes) || (c.lessons || []).reduce((m, l) => m + (Number(l.minutes) || 0), 0)), 0);

	return (
		<div className="ac-curriculum">
			<header className="ac-path-hero">
				<div>
					<button type="button" className="ac-back" onClick={onLeave}><ArrowLeft className="h-3.5 w-3.5" /> All paths</button>
					<span className="ac-eyebrow" style={{ marginTop: 16 }}>Learning path · {pct}% complete</span>
					<h1 className="ac-title">{curriculum.pathName}</h1>
					<p className="ac-lede">{curriculum.focus}</p>
					<div className="ac-path-hero-meta">
						<span>{completed} / {totalLessons} lessons</span>
						<span>{Math.max(1, Math.ceil(totalMinutes / 60))}h of reading</span>
						<span>{certificate?.certificateCode ? 'Certificate issued' : 'Certificate on final exam'}</span>
					</div>
					{isPreview && <p className="ac-status-note" style={{ marginTop: 14 }}><Loader2 className="h-3.5 w-3.5 animate-spin" /> SI is personalizing this path — the full topic map is below.</p>}
				</div>
				<div className="ac-path-hero-side">
					<div className="ac-ring" style={{ '--ac-pct': `${pct}%` }}>
						<div className="ac-ring-inner"><strong>{pct}%</strong><span>complete</span></div>
					</div>
					<button type="button" className="ac-link-btn" onClick={() => setCourseIndex(Math.min(safeCourseIndex + 1, Math.max(0, courses.length - 1)))}>
						Next chapter <ChevronRight className="h-3.5 w-3.5" />
					</button>
				</div>
			</header>

			{certificate?.certificateCode && (
				<div className="ac-cert-banner">
					<Trophy className="h-5 w-5" />
					<div style={{ minWidth: 0, flex: 1 }}>
						<strong>{t('aca.certifiedPf', { path: curriculum.pathName })}</strong>
						<span>{t('aca.codePf')} {certificate.certificateCode}{certificate.certificateGeneratedAt ? ` · ${new Date(certificate.certificateGeneratedAt).toLocaleDateString()}` : ''}</span>
					</div>
					<BadgeCheck className="h-6 w-6" style={{ color: 'var(--ac-green)' }} />
				</div>
			)}

			<div className="ac-curriculum-body">
				<aside className="ac-course-list" aria-label="Path chapters">
					<div className="ac-course-list-head">Chapters</div>
					{courses.map((c, i) => {
						const done = c.lessons.filter((l) => progressMap[`${c.courseKey}:${l.lessonKey}`]?.completed).length;
						return (
							<button key={c.courseKey} type="button" onClick={() => setCourseIndex(i)} className={`ac-course-btn ${safeCourseIndex === i ? 'is-active' : ''}`}>
								<span className="ac-course-btn-num">{String(i + 1).padStart(2, '0')}</span>
								<span className="ac-course-btn-copy">
									<strong>{c.title}</strong>
									<small>{done} / {c.lessons.length} lessons</small>
								</span>
								<ChevronRight className="h-3.5 w-3.5" />
							</button>
						);
					})}
					<div className="ac-exam-mini">
						<span>Final certificate exam</span>
						<strong>{examPassed ? <><BadgeCheck className="h-3.5 w-3.5" /> Passed · {examPct}%</> : allDone ? <><Award className="h-3.5 w-3.5" /> Ready to take</> : <><Lock className="h-3.5 w-3.5" /> {totalLessons - completed} lessons to unlock</>}</strong>
					</div>
				</aside>

				<section className="ac-lesson-panel">
					{course ? (
						<>
							<div className="ac-lesson-panel-head">
								<div>
									<span className="ac-section-kicker">Chapter {String(safeCourseIndex + 1).padStart(2, '0')} of {String(courses.length).padStart(2, '0')}</span>
									<h2>{course.title}</h2>
									<p>{course.description}</p>
								</div>
								<span className="ac-lesson-panel-meta">{course.lessons.filter((l) => progressMap[`${course.courseKey}:${l.lessonKey}`]?.completed).length} / {course.lessons.length} · {course.minutes || course.lessons.reduce((m, l) => m + (Number(l.minutes) || 0), 0)} min</span>
							</div>
							<div className="ac-lesson-list">
								{course.lessons.map((l, li) => {
									const isDone = progressMap[`${course.courseKey}:${l.lessonKey}`]?.completed;
									return (
										<button key={l.lessonKey} type="button" onClick={() => onOpenLesson(course, l)} className={`ac-lesson-row ${isDone ? 'is-done' : ''}`}>
											<span className="ac-lesson-num">{String(li + 1).padStart(2, '0')}</span>
											<span style={{ minWidth: 0 }}>
												<span className="ac-row-title">{l.title}</span>
												<span className="ac-lesson-sub"><Clock className="h-3 w-3" /> {t('aca.minutes', { n: l.minutes })}{isDone && <span className="is-done">· {t('aca.completed')}</span>}</span>
											</span>
											<span className="ac-lesson-end">
												{isDone ? <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--ac-green)' }} /> : <PlayCircle className="h-4 w-4" />}
												<ChevronRight className="h-4 w-4" />
											</span>
										</button>
									);
								})}
							</div>
						</>
					) : (
						<div className="ac-empty"><strong>This path is being prepared.</strong><p>The SI is still mapping the chapters. Check back shortly.</p></div>
					)}
				</section>
			</div>

			<section className="ac-gate">
				<div>
					<span className="ac-seal"><Award className="h-5 w-5" /></span>
					<span className="ac-section-kicker" style={{ marginTop: 13 }}>The final gate</span>
					<h2 className="ac-gate-title">Finish the path. Then take the exam.</h2>
					<p className="ac-gate-copy">Every lesson stays open and question-free. The certificate exam unlocks only when all {totalLessons} lessons are complete, and it tests the whole path in one sitting.</p>
					<div className="ac-gate-actions">
						{certificate?.certificateCode ? (
							<span className="ac-status-note is-green"><BadgeCheck className="h-4 w-4" /> Certificate issued</span>
						) : examPassed ? (
							<button type="button" className="ac-btn ac-btn-gold" onClick={onClaimCertificate}><Award className="h-4 w-4" /> {t('aca.claimCert')}</button>
						) : allDone ? (
							<button type="button" className="ac-btn ac-btn-gold" onClick={onOpenExam}><PlayCircle className="h-4 w-4" /> {t('aca.startFinalExam', null, 'Start final exam')}</button>
						) : (
							<button type="button" className="ac-btn ac-btn-quiet" disabled><Lock className="h-4 w-4" /> {totalLessons - completed} lessons to unlock</button>
						)}
						<button type="button" className="ac-btn ac-btn-ghost" onClick={onLeave}>All paths</button>
					</div>
				</div>
				<div className="ac-gate-status">
					<div className="ac-gate-status-row"><span>Lessons</span><strong>{completed} / {totalLessons}</strong></div>
					<div className="ac-gate-status-row"><span>Final exam</span><strong className={examPassed ? 'is-green' : allDone ? 'is-gold' : ''}>{examPassed ? `Passed · ${examPct}%` : allDone ? 'Ready' : 'Locked'}</strong></div>
					<div className="ac-gate-status-row"><span>Certificate</span><strong className={certificate?.certificateCode ? 'is-green' : ''}>{certificate?.certificateCode ? 'Issued' : examPassed ? 'Ready to claim' : 'Not issued'}</strong></div>
				</div>
			</section>
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
		<div className="ac-topics">
			<div className="ac-page-intro">
				<div>
					<span className="ac-eyebrow">Topic index</span>
					<h2 className="ac-page-title">Every lesson. One search.</h2>
					<p className="ac-page-sub">Pips, leverage, sessions, CPI/NFP, SMC/ICT, carry, wallets, perps, funding, on-chain and DeFi. Find the topic, then open the path that teaches it.</p>
				</div>
				<span className="ac-topic-count">{filtered.length} topics</span>
			</div>

			<div className="ac-search-row">
				<div className="ac-search">
					<Search className="h-4 w-4" />
					<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pips, funding, NFP, wallets, SMC, carry…" />
				</div>
				<div className="ac-filter">
					{TRACKS.map((tr) => (
						<button key={tr.key} type="button" onClick={() => setTrack(tr.key)} className={`ac-filter-btn ${track === tr.key ? 'is-active' : ''}`}>{tr.name}</button>
					))}
				</div>
			</div>

			{grouped.length === 0 ? (
				<div className="ac-empty"><strong>No topics match.</strong><p>Try “leverage”, “funding”, “NFP” or “wallet”.</p></div>
			) : (
				<div className="ac-topic-groups">
					{grouped.map((g) => {
						const path = PATHS.find((p) => p.key === g.pathKey);
						return (
							<section key={`${g.pathKey}-${g.courseKey}`} className="ac-topic-group">
								<div className="ac-topic-group-head">
									<div>
										<span>{path?.name || g.pathName}</span>
										<strong>{g.courseTitle}</strong>
									</div>
									<button type="button" className="ac-btn ac-btn-sm ac-btn-ghost" onClick={() => onStartPath(g.pathKey)}>Start this path</button>
								</div>
								<div className="ac-topic-grid">
									{g.items.map((lp) => (
										<button key={lp.lessonKey} type="button" onClick={() => onStartPath(g.pathKey)} className="ac-topic-item">
											<BookOpen className="h-3.5 w-3.5" />
											<span style={{ minWidth: 0, flex: 1 }}>
												<span>{lp.title}</span>
												<small><Timer className="mr-1 inline h-2.5 w-2.5" />{lp.minutes} min · {(lp.tags || []).slice(0, 3).join(' · ')}</small>
											</span>
											<ChevronRight className="h-3.5 w-3.5" />
										</button>
									))}
								</div>
							</section>
						);
					})}
				</div>
			)}
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
	const [view, setView] = useState('paths'); // paths | curriculum | lesson | exam
	const [activePath, setActivePath] = useState(null);
	const [activeCourse, setActiveCourse] = useState(null);
	const [activeLesson, setActiveLesson] = useState(null);
	const [generating, setGenerating] = useState(null); // pathKey being generated
	const [rsvps, setRsvps] = useState([]);
	const [attended, setAttended] = useState([]);
	const [tab, setTab] = useState('learn');
	const [trackFilter, setTrackFilter] = useState('all');

	useEffect(() => {
		try { window.scrollTo(0, 0); } catch { /* ignore */ }
	}, [view, activePath?.key, activeLesson?.lessonKey]);

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

	// The first lesson is the slowest one because the SI has to write it from
	// scratch. Warm it while the student is still on the dashboard or path
	// overview so the first click usually lands on ready content. The server
	// shares an in-flight generation with the eventual open request.
	const prefetchTarget = useMemo(() => {
		if (access !== true || !data || view === 'lesson' || view === 'exam') return null;
		const enrollments = view === 'curriculum' && activePath
			? (data.enrollments || []).filter((entry) => entry.pathKey === activePath.key)
			: data.enrollments || [];
		for (const enrollment of enrollments) {
			const curriculum = data.curricula?.find((entry) => entry.pathKey === enrollment.pathKey)?.curriculum
				|| STATIC_CURRICULA[enrollment.pathKey];
			if (!curriculum) continue;
			for (const course of curriculum.courses || []) {
				for (const lesson of course.lessons || []) {
					if (!progressMap[`${course.courseKey}:${lesson.lessonKey}`]?.completed) {
						return { pathKey: enrollment.pathKey, courseKey: course.courseKey, lessonKey: lesson.lessonKey };
					}
				}
			}
		}
		return null;
	}, [access, activePath, data, progressMap, view]);

	useEffect(() => {
		if (!prefetchTarget) return undefined;
		const timer = window.setTimeout(() => {
			if (document.visibilityState !== 'visible') return;
			getLesson(prefetchTarget.pathKey, prefetchTarget.courseKey, prefetchTarget.lessonKey).catch(() => {});
		}, 2000);
		return () => window.clearTimeout(timer);
	}, [prefetchTarget]);

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

	const openExam = (path) => {
		if (!path) return;
		setActivePath(path);
		setView('exam');
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
				<div className="tb-page academy-studio">
				<Paywall onPurchased={() => { toast({ title: t('aca.welcome'), description: t('aca.welcomeSub') }); refreshAccess(); }} />
				<div className="mt-6">
					<TopicExplorer onStartPath={() => { toast({ title: t('aca.badge'), description: 'Get lifetime access to unlock all paths and lessons.' }); }} />
				</div>
				</div>
			</AppLayout>
		);
	}

	// ── Load failure → error panel with retry (never a stuck loader) ──
	if (loadError) {
		return (
			<AppLayout title={t('aca.page')}>
				<div className="tb-page academy-studio">
				<EmptyState
					icon={GraduationCap}
					title={t('aca.loadFailRetry', null, 'Could not load your Academy. Check your connection, then try again.')}
					action={<GoldButton onClick={() => { setLoadError(null); setAccess(null); setData(null); refreshAccess(); }}>{t('c.retry', null, 'Retry')}</GoldButton>}
				/>
				</div>
			</AppLayout>
		);
	}

	if (access === null || !data) {
		return (
			<AppLayout title={t('aca.page')}>
				<div className="tb-page academy-studio">
				<div className="ac-state">
					<Loader2 className="h-7 w-7 animate-spin" />
					<strong>{t('aca.loading')}</strong>
					<p>Opening your studio — paths, progress and certificates.</p>
				</div>
				</div>
			</AppLayout>
		);
	}

	const enrolled = data.enrollments || [];

	// ── Lesson view ──
	if (view === 'lesson' && activePath && activeCourse && activeLesson) {
		const lessonCurriculum = curriculumFor(activePath.key) || STATIC_CURRICULA[activePath.key] || { pathName: activePath.name, courses: [] };
		const flatLessons = flattenLessons(lessonCurriculum);
		const lessonIndex = flatLessons.findIndex((x) => x.course.courseKey === activeCourse.courseKey && x.lesson.lessonKey === activeLesson.lessonKey);
		const next = lessonIndex >= 0 ? flatLessons[lessonIndex + 1] : null;
		const pathDone = flatLessons.filter((x) => progressMap[`${x.course.courseKey}:${x.lesson.lessonKey}`]?.completed).length;
		return (
			<AppLayout title={t('aca.page')}>
				<div className="tb-page academy-studio">
				<LessonView
					pathKey={activePath.key}
					curriculum={lessonCurriculum}
					course={activeCourse}
					lesson={activeLesson}
					progress={progressMap[`${activeCourse.courseKey}:${activeLesson.lessonKey}`]}
					lessonNumber={lessonIndex >= 0 ? lessonIndex + 1 : 1}
					totalLessons={flatLessons.length}
					pathDone={pathDone}
					nextLesson={next?.lesson || null}
					nextLessonCourseKey={next?.course.courseKey || null}
					onBack={() => { setView('curriculum'); setActiveCourse(null); setActiveLesson(null); }}
					onLessonDone={refreshProgress}
					onNext={next ? () => openLesson(next.course, next.lesson) : undefined}
					onTakeExam={() => openExam(activePath)}
				/>
				</div>
			</AppLayout>
		);
	}

	// ── Certificate exam ──
	if (view === 'exam' && activePath) {
		const certificate = enrollmentFor(activePath.key);
		return (
			<AppLayout title={t('aca.page')}>
				<div className="tb-page academy-studio">
				<FinalExamView
					pathKey={activePath.key}
					pathName={activePath.name}
					certificate={certificate}
					onBack={() => setView('curriculum')}
					onPassed={refreshProgress}
					onClaimCertificate={() => doClaimCertificate(activePath.key)}
				/>
				</div>
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
		const exam = examForPath(data.progress, activePath.key);
		return (
			<AppLayout title={t('aca.page')}>
				<div className="tb-page academy-studio">
				{!curriculum || generating === activePath.key && !curriculum ? (
					<div className="ac-state">
						<Loader2 className="h-7 w-7 animate-spin" />
						<strong>{t('aca.designing', { path: activePath.name })}</strong>
						<p>{t('aca.designingSub')}</p>
					</div>
				) : (
					<CurriculumView
						pathKey={activePath.key}
						curriculum={curriculum}
						progressMap={progressMap}
						certificate={certificate}
						exam={exam}
						isPreview={isPreview || generating === activePath.key}
						onOpenLesson={openLesson}
						onOpenExam={() => openExam(activePath)}
						onClaimCertificate={() => doClaimCertificate(activePath.key)}
						onLeave={() => { setView('paths'); setActivePath(null); }}
					/>
				)}
				</div>
			</AppLayout>
		);
	}

	// ── Dashboard / studio ──
	const studio = (() => {
		let total = 0;
		let done = 0;
		let completePaths = 0;
		let completePathKey = null;
		let nextUp = null;
		for (const enrollment of enrolled) {
			const curriculum = data?.curricula?.find((entry) => entry.pathKey === enrollment.pathKey)?.curriculum || STATIC_CURRICULA[enrollment.pathKey];
			if (!curriculum) continue;
			let pathTotal = 0;
			let pathDone = 0;
			for (const course of curriculum.courses || []) {
				for (const lesson of course.lessons || []) {
					pathTotal += 1;
					const completed = progressMap[`${course.courseKey}:${lesson.lessonKey}`]?.completed;
					if (completed) {
						pathDone += 1;
						done += 1;
					} else if (!nextUp) {
						nextUp = { pathKey: enrollment.pathKey, pathName: curriculum.pathName, course, lesson };
					}
				}
			}
			total += pathTotal;
			if (pathTotal > 0 && pathDone >= pathTotal) {
				completePaths += 1;
				if (!completePathKey) completePathKey = enrollment.pathKey;
			}
		}
		return { total, done, pct: total ? Math.round((done / total) * 100) : 0, completePaths, completePathKey, nextUp };
	})();

	const certifiedCount = enrolled.filter((e) => e.certificateCode).length;
	const gateState = certifiedCount > 0 ? 'issued' : studio.completePaths > 0 ? 'ready' : 'locked';
	const continueLearning = () => {
		if (studio.nextUp) {
			const path = PATHS.find((p) => p.key === studio.nextUp.pathKey);
			if (path) {
				setActivePath(path);
				openLesson(studio.nextUp.course, studio.nextUp.lesson);
				return;
			}
		}
		selectTab(enrolled.length ? 'certificates' : 'learn');
	};
	const scrollToPaths = () => {
		document.getElementById('ac-paths')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};
	const openPath = (path) => {
		setActivePath(path);
		setView('curriculum');
	};
	const selectTab = (nextTab) => {
		setTab(nextTab);
		window.setTimeout(() => {
			document.querySelector('.ac-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 0);
	};
	const openReadyExam = () => {
		const path = PATHS.find((p) => p.key === studio.completePathKey);
		if (path) openExam(path);
		else selectTab('certificates');
	};

	const studioTabs = [
		{ id: 'learn', label: 'Curriculum' },
		{ id: 'topics', label: 'Topic index' },
		{ id: 'webinars', label: 'Live room' },
		{ id: 'certificates', label: 'Certificates' },
	];

	return (
		<AppLayout title={t('aca.page')}>
			<div className="tb-page academy-studio">
				<section className="ac-hero">
					<div className="ac-hero-copy">
						<span className="ac-eyebrow">TradingBible Academy · Studio 01</span>
						<h1 className="ac-title">
							Learn the market.
							<br />
							<em>Then prove it.</em>
						</h1>
						<p className="ac-lede">
							A structured path from first candle to desk-level execution. Read every lesson at your own pace; the final certificate exam is the only test.
						</p>
						<div className="ac-hero-actions">
							<button type="button" className="ac-btn ac-btn-gold" onClick={studio.nextUp ? continueLearning : enrolled.length ? () => selectTab('certificates') : scrollToPaths}>
								{studio.nextUp ? 'Continue learning' : enrolled.length ? 'Open certificates' : 'Choose a path'}
								<ChevronRight className="h-4 w-4" />
							</button>
							<button type="button" className="ac-btn ac-btn-ghost" onClick={() => selectTab('topics')}>
								Browse the topic index
							</button>
						</div>
						<p className="ac-hero-note"><span /> No quizzes inside lessons · One final exam per path · Certificate on pass</p>
					</div>
					<aside className="ac-progress-card" aria-label="Your Academy progress">
						<div className="ac-ring" style={{ '--ac-pct': `${studio.pct}%` }}>
							<div className="ac-ring-inner">
								<strong>{studio.pct}%</strong>
								<span>path progress</span>
							</div>
						</div>
						<div className="ac-progress-stats">
							<div>
								<span>Lessons</span>
								<strong>{studio.total ? `${studio.done} / ${studio.total}` : 'Not started'}</strong>
							</div>
							<div>
								<span>Next up</span>
								<strong>{studio.nextUp?.lesson?.title || 'Choose a path'}</strong>
							</div>
						</div>
						<button type="button" className="ac-link-btn" onClick={studio.nextUp ? continueLearning : () => selectTab('certificates')}>
							{studio.nextUp ? 'Open next lesson' : 'View certificate track'} <ChevronRight className="h-3.5 w-3.5" />
						</button>
					</aside>
				</section>

				<section className="ac-ledger" aria-label="Academy catalogue">
					<div className="ac-ledger-item"><span>Learning paths</span><strong>{String(totals.paths).padStart(2, '0')}</strong><small>Foundation to professional</small></div>
					<div className="ac-ledger-item"><span>Forex lessons</span><strong>{forexCount}</strong><small>Pairs · sessions · risk</small></div>
					<div className="ac-ledger-item"><span>Crypto lessons</span><strong>{cryptoCount}</strong><small>Wallets · perps · on-chain</small></div>
					<div className="ac-ledger-item"><span>Study time</span><strong>{Math.round(totals.minutes / 60)}h+</strong><small>Read at your own pace</small></div>
				</section>

				<div className="ac-toolbar">
					<nav className="ac-tabs" role="tablist" aria-label="Academy sections">
						{studioTabs.map((item, index) => (
							<button
								key={item.id}
								type="button"
								role="tab"
								aria-selected={tab === item.id}
								className={`ac-tab ${tab === item.id ? 'is-active' : ''}`}
								onClick={() => selectTab(item.id)}
							>
								<span className="ac-tab-index">0{index + 1}</span>
								{item.label}
							</button>
						))}
					</nav>
					{(tab === 'learn' || tab === 'webinars') && (
						<div className="ac-filter" aria-label="Filter by desk">
							{[{ key: 'all', name: 'All' }, ...TRACKS.filter((x) => x.key !== 'all')].map((tr) => (
								<button key={tr.key} type="button" className={`ac-filter-btn ${trackFilter === tr.key ? 'is-active' : ''}`} onClick={() => setTrackFilter(tr.key)}>
									{tr.name}
								</button>
							))}
						</div>
					)}
				</div>

				{tab === 'learn' && (
					<div id="ac-paths">
						<div className="ac-section-head">
							<div>
								<span className="ac-section-kicker">01 — The curriculum</span>
								<h2 className="ac-section-title">Choose your desk.</h2>
							</div>
							<p className="ac-section-sub">Six paths. One standard: finish every lesson, then pass the final certificate exam. No pop quizzes, no filler.</p>
						</div>
						<div className="ac-path-grid">
							{filteredPaths.map((p, index) => {
								const isEnrolled = enrolled.some((e) => e.pathKey === p.key);
								const curriculum = curriculumFor(p.key) || STATIC_CURRICULA[p.key];
								const cert = enrollmentFor(p.key);
								const exam = examForPath(data.progress, p.key);
								const examPct = examPercent(exam);
								const examPassed = examPct >= EXAM_PASS_PERCENT;
								const stats = pathStats(p.key);
								const lessons = curriculum?.courses.reduce((a, c) => a + c.lessons.length, 0) || stats.lessons || 0;
								const courseCount = curriculum?.courses.length || stats.courses || 0;
								const totalMinutes = curriculum?.courses.reduce((a, c) => a + (Number(c.minutes) || (c.lessons || []).reduce((m, l) => m + (Number(l.minutes) || 0), 0)), 0) || stats.minutes || 0;
								const done = curriculum ? curriculum.courses.reduce((a, c) => a + c.lessons.filter((l) => progressMap[`${c.courseKey}:${l.lessonKey}`]?.completed).length, 0) : 0;
								const pct = lessons ? Math.round((done / lessons) * 100) : 0;
								const trackColor = TRACK_COLORS[p.track] || p.color;
								const actionLabel = generating === p.key
									? 'Preparing path…'
									: cert?.certificateCode
										? 'View record'
										: !isEnrolled
											? 'Enroll'
											: pct >= 100
												? examPassed ? 'Claim certificate' : 'Take final exam'
												: 'Continue';
								const onAction = () => {
									if (generating === p.key) return;
									if (!isEnrolled) { enroll(p); return; }
									if (cert?.certificateCode) { openPath(p); return; }
									if (pct >= 100) {
										if (examPassed) doClaimCertificate(p.key);
										else openExam(p);
										return;
									}
									openPath(p);
								};
								return (
									<article key={p.key} className="ac-path-card" style={{ '--ac-accent': trackColor, '--ac-accent-soft': `${trackColor}18` }}>
										<div className="ac-path-top">
											<span className="ac-path-index">{String(index + 1).padStart(2, '0')}</span>
											<span className="ac-path-icon"><PathIcon icon={p.icon} color={trackColor} /></span>
											<span className="ac-path-label"><strong>{p.level}</strong>{p.track} desk</span>
											<span className="ac-path-track">{isEnrolled ? `${pct}%` : 'Open'}</span>
										</div>
										<h3 className="ac-path-title">{p.name}</h3>
										<p className="ac-path-desc">{p.desc}</p>
										<div className="ac-path-skills">
											{(p.skills || []).slice(0, 4).map((s) => <span key={s} className="ac-skill">{s}</span>)}
										</div>
										<div className="ac-path-foot">
											<div className="ac-path-meta">
												<span>{courseCount} {courseCount === 1 ? 'course' : 'courses'}</span>
												<span>{lessons} lessons</span>
												<span>~{Math.max(1, Math.ceil(totalMinutes / 60))}h</span>
											</div>
											<div className="ac-path-action">
												<button type="button" className={`ac-btn ac-btn-sm ${isEnrolled ? 'ac-btn-ghost' : 'ac-btn-gold'}`} onClick={onAction} disabled={generating === p.key}>
													{generating === p.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEnrolled ? <PlayCircle className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
													{actionLabel}
												</button>
											</div>
										</div>
										{isEnrolled && lessons > 0 && (
											<div className="ac-path-progress">
												<div className="ac-path-progress-line"><span>{done} / {lessons} lessons</span><strong>{pct}%</strong></div>
												<div className="ac-bar"><div className="ac-bar-fill" style={{ width: `${pct}%` }} /></div>
											</div>
										)}
										{isEnrolled && pct === 100 && !cert?.certificateCode && (
											<p className={`ac-status-note ${examPassed ? 'is-green' : ''}`}>
												{examPassed ? <BadgeCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
												{examPassed ? `Exam passed · ${examPct}% — certificate ready` : 'Final exam unlocked'}
											</p>
										)}
									</article>
								);
							})}
						</div>
						{filteredPaths.length === 0 && <div className="ac-empty"><strong>No paths in this desk.</strong><p>Switch the filter above to see the rest of the curriculum.</p></div>}
					</div>
				)}

				{tab === 'topics' && <TopicExplorer onStartPath={startPathByKey} />}

				{tab === 'webinars' && (
					<div>
						<div className="ac-page-intro">
							<div>
								<span className="ac-eyebrow">Live room · {t('aca.liveInteractive')}</span>
								<h2 className="ac-page-title">Learn in the room.</h2>
								<p className="ac-page-sub">Weekly Forex and Crypto desks with an SI host. Bring a chart, a question or a decision you are working through.</p>
							</div>
							<div className="ac-filter">
								{[{ key: 'all', name: 'All desks' }, { key: 'forex', name: 'Forex' }, { key: 'crypto', name: 'Crypto' }, { key: 'general', name: 'General' }, { key: 'pro', name: 'Pro' }].map((tr) => (
									<button key={tr.key} type="button" className={`ac-filter-btn ${trackFilter === tr.key ? 'is-active' : ''}`} onClick={() => setTrackFilter(tr.key)}>{tr.name}</button>
								))}
							</div>
						</div>
						<div className="ac-webinar-grid">
							{filteredWebinars.map((w) => {
								const { live, start } = w.state;
								const rsvped = rsvps.includes(w.id);
								const wColor = TRACK_COLORS[w.track] || '#d4af37';
								return (
									<article key={w.id} className={`ac-webinar-card ${live ? 'is-live' : ''}`}>
										<div className="ac-webinar-badges">
											{live
												? <span className="ac-webinar-badge is-live">● Live now</span>
												: <span className="ac-webinar-badge">{WEEKDAYS[w.day]} · {w.hour % 12 || 12}:00 {w.hour >= 12 ? 'PM' : 'AM'} EST</span>}
											<span className="ac-webinar-badge" style={{ color: wColor, borderColor: `${wColor}44` }}>{w.track}</span>
										</div>
										<h3 className="ac-webinar-title">{w.title}</h3>
										<p className="ac-webinar-host">{w.host}</p>
										<p className="ac-webinar-desc">{w.description}</p>
										<div className="ac-webinar-foot">
											<span className="ac-webinar-time">{live ? 'In progress' : `Starts in ${fmtCountdown(start, t)}`}{attended.includes(w.id) ? ' · Attended' : ''}</span>
											<button type="button" className={`ac-btn ac-btn-sm ${rsvped ? 'ac-btn-quiet' : 'ac-btn-ghost'}`} onClick={() => toggleRsvp(w.id)}>
												{rsvped ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
												{rsvped ? 'On the list' : 'Reserve seat'}
											</button>
										</div>
									</article>
								);
							})}
						</div>
						{filteredWebinars.find((w) => w.state.live) ? (
							<div className="ac-tutor">
								<div className="ac-tutor-head"><Radio className="h-4 w-4" /><strong>{t('aca.liveRoom')}</strong><span>{t('aca.liveNow')}</span></div>
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
							<p className="ac-section-sub" style={{ marginTop: 18 }}>No desk is live right now. Reserve a seat above and the room opens at the scheduled time.</p>
						)}
					</div>
				)}

				{tab === 'certificates' && (
					<div>
						<div className="ac-page-intro">
							<div>
								<span className="ac-eyebrow">Certification · {t('aca.yourCerts')}</span>
								<h2 className="ac-page-title">A record of the work.</h2>
								<p className="ac-page-sub">One certificate per path. Issued only after every lesson is complete and the final exam is passed.</p>
							</div>
						</div>
						{enrolled.length === 0 ? (
							<div className="ac-empty"><strong>No certificate track yet.</strong><p>Enroll in a path first. Your certificate will appear here after the final exam.</p></div>
						) : (
							<div className="ac-cert-list">
								{enrolled.map((e) => {
									const p = PATHS.find((x) => x.key === e.pathKey);
									const curriculum = curriculumFor(e.pathKey) || STATIC_CURRICULA[e.pathKey];
									const lessons = curriculum?.courses.reduce((a, c) => a + c.lessons.length, 0) || 0;
									const done = curriculum ? curriculum.courses.reduce((a, c) => a + c.lessons.filter((l) => progressMap[`${c.courseKey}:${l.lessonKey}`]?.completed).length, 0) : 0;
									const pct = lessons ? Math.round((done / lessons) * 100) : 0;
									const exam = examForPath(data.progress, e.pathKey);
									const examPct = examPercent(exam);
									const examPassed = examPct >= EXAM_PASS_PERCENT;
									return (
										<div key={e.pathKey} className="ac-cert-row">
											<div className="ac-cert-row-main">
												<span className={`ac-cert-row-icon ${e.certificateCode ? 'is-green' : examPassed ? 'is-gold' : ''}`}>{e.certificateCode ? <Trophy className="h-4 w-4" /> : examPassed ? <Award className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</span>
												<div>
													<strong>{p?.name || e.pathKey}</strong>
													<small>{e.certificateCode ? <>{t('aca.codePf')} <b>{e.certificateCode}</b> · {new Date(e.certificateGeneratedAt).toLocaleDateString()}</> : <>{done} / {lessons} lessons · {examPassed ? `exam passed ${examPct}%` : pct === 100 ? 'final exam required' : `${pct}% complete`}</>}</small>
												</div>
											</div>
											{e.certificateCode ? (
												<span className="ac-status-note is-green"><BadgeCheck className="h-4 w-4" /> Certified</span>
											) : pct < 100 ? (
												<button type="button" className="ac-btn ac-btn-sm ac-btn-quiet" disabled>{100 - pct}% remaining</button>
											) : examPassed ? (
												<button type="button" className="ac-btn ac-btn-sm ac-btn-gold" onClick={() => doClaimCertificate(e.pathKey)}>{t('aca.claimCert')}</button>
											) : (
												<button type="button" className="ac-btn ac-btn-sm ac-btn-ghost" onClick={() => openExam(p)}>Take final exam</button>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}

				<section className="ac-gate">
					<div>
						<span className="ac-seal"><Award className="h-5 w-5" /></span>
						<span className="ac-section-kicker" style={{ marginTop: 13 }}>02 — Certification gate</span>
						<h2 className="ac-gate-title">One exam. One certificate.</h2>
						<p className="ac-gate-copy">The lessons stay open and question-free. When the path is complete, a single final exam tests the whole curriculum. Pass at {EXAM_PASS_PERCENT}% and the certificate is issued to your record.</p>
						<div className="ac-gate-actions">
							{gateState === 'issued' ? (
								<button type="button" className="ac-btn ac-btn-gold" onClick={() => selectTab('certificates')}>View certificates <ChevronRight className="h-4 w-4" /></button>
							) : gateState === 'ready' ? (
								<button type="button" className="ac-btn ac-btn-gold" onClick={openReadyExam}>Open final exam <ChevronRight className="h-4 w-4" /></button>
							) : (
								<button type="button" className="ac-btn ac-btn-gold" onClick={scrollToPaths}>Choose a path <ChevronRight className="h-4 w-4" /></button>
							)}
							<button type="button" className="ac-btn ac-btn-ghost" onClick={() => selectTab('certificates')}>Certificate track</button>
						</div>
					</div>
					<div className="ac-gate-status">
						<div className="ac-gate-status-row"><span>Lessons complete</span><strong>{studio.total ? `${studio.done} / ${studio.total}` : '—'}</strong></div>
						<div className="ac-gate-status-row"><span>Final exam</span><strong className={gateState === 'ready' ? 'is-gold' : gateState === 'issued' ? 'is-green' : ''}>{gateState === 'issued' ? 'Passed' : gateState === 'ready' ? 'Ready' : 'Locked'}</strong></div>
						<div className="ac-gate-status-row"><span>Certificate</span><strong className={gateState === 'issued' ? 'is-green' : ''}>{certifiedCount > 0 ? `${certifiedCount} issued` : gateState === 'ready' ? 'Ready to claim' : 'Not issued'}</strong></div>
					</div>
				</section>

				<div className="ac-mentor">
					<div className="ac-mentor-main">
						<span className="ac-mentor-icon"><Bot className="h-4 w-4" /></span>
						<div>
							<strong>SI is inside every lesson.</strong>
							<span>Ask for a worked example, a chart read, or a plain-English explanation. It is a tutor, not a signal service.</span>
						</div>
					</div>
					<button type="button" className="ac-link-btn" onClick={continueLearning}>Ask in your next lesson <ChevronRight className="h-3.5 w-3.5" /></button>
				</div>
			</div>
		</AppLayout>
	);
}
