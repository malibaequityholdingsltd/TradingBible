import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	PlayCircle, Clock, CheckCircle2, Lock, GraduationCap, Video, Route, Award, Sparkles,
	Rocket, BookOpen, Bot, ArrowLeft, RotateCcw, ChevronRight, Trophy, Calendar, Radio, Loader2,
	MessageSquare, Send, BadgeCheck, CircleDollarSign,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { openAcademyCheckout, getPaddleConfig } from '@/lib/paddle';
import {
	getAcademyAccess, enrollInPath, getCurriculum, getLesson, gradeQuiz,
	completeLesson, getAcademyProgress, claimCertificate, rsvpWebinar, unrsvpWebinar,
} from '@/lib/academy';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

// ── Learning paths (AI personalizes the curriculum inside each) ─────
const PATHS = [
	{
		key: 'beginner', name: 'Beginner Foundation', level: 'Beginner', color: '#34d399',
		desc: 'From zero: how markets work, the assets you trade, and the discipline-first habits that keep you alive.',
	},
	{
		key: 'intermediate', name: 'Intermediate Edge', level: 'Intermediate', color: '#d4af37',
		desc: 'Sharpen your process: advanced analysis, trading psychology and precise position sizing.',
	},
	{
		key: 'professional', name: 'Professional Desk', level: 'Professional', color: '#e0a0f0',
		desc: 'Trade like an institution: systematic strategies, portfolio management and fund-grade execution.',
	},
];

const WEBINAR_SCHEDULE = [
	{
		id: 'market-open-breakdown', title: 'Live Market Open Breakdown', day: 1, hour: 8, duration: 60,
		host: 'AI Host · TradingBible Desk',
		description: 'A live walkthrough of the market open — key levels, liquidity zones and the trades the day is offering.',
	},
	{
		id: 'journal-review', title: 'Journal Review: Fixing Your Worst Trades', day: 3, hour: 17, duration: 60,
		host: 'AI Host · TradingBible Coaches',
		description: 'Bring your worst trade of the week. The room breaks down the mistake and rebuilds the entry.',
	},
	{
		id: 'risk-qa', title: 'Risk & Position Sizing Q&A', day: 5, hour: 14, duration: 45,
		host: 'AI Host · TradingBible Research',
		description: 'Open floor on risk: sizing models, stop placement, drawdown control and portfolio heat.',
	},
	{
		id: 'ai-trading-lab', title: 'AI Trading Lab: Strategy Build', day: 6, hour: 11, duration: 75,
		host: 'AI Host · TradingBible Systems',
		description: 'A live strategy workshop — the AI host designs a systematic setup with the room, end to end.',
	},
];

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
	if (now < start.getTime()) return { live: false, start, end };
	return { live: false, start, end }; // wrapped to next occurrence
}

function fmtCountdown(target) {
	const diff = target.getTime() - Date.now();
	if (diff <= 0) return 'live now';
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
				headers: { Authorization: pb.authStore.token, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
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
			toast({ variant: 'destructive', title: 'Error', description: err.message });
		} finally {
			abortRef.current = null;
			setStreaming(false);
		}
	};

	return (
		<div className="flex h-[380px] flex-col overflow-hidden rounded-2xl border border-[#d4af37]/15 bg-[#0d0d12]/60">
			<div className="flex items-center gap-2 border-b border-[#d4af37]/10 px-4 py-3">
				<Bot className="h-4 w-4" style={{ color: accent }} />
				<span className="text-sm font-semibold text-[#f0ecdd]">{placeholder}</span>
				{streaming && <Loader2 className="ml-auto h-4 w-4 animate-spin text-[#d4af37]" />}
			</div>
			<div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
				{messages.length === 0 && (
					<p className="text-xs leading-relaxed text-[#6a665a]">Ask anything about this lesson. The AI tutor knows the material you are reading and will guide you to the answer.</p>
				)}
				{messages.map((m, i) => (
					<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
						<div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'border border-[#d4af37]/12 bg-[#111113] text-[#c9c4b4]'}`}>
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
					placeholder={streaming ? 'AI is typing…' : 'Ask the AI tutor…'}
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
	const [busy, setBusy] = useState(false);
	const [configured, setConfigured] = useState(true);
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		getPaddleConfig().then((cfg) => setConfigured(Boolean(cfg?.prices?.academy))).catch(() => {}).finally(() => setChecked(true));
	}, []);

	const buy = async () => {
		setBusy(true);
		try {
			await openAcademyCheckout((e) => {
				if (e?.name === 'checkout.completed' || e?.name === 'transaction.completed') {
					setTimeout(onPurchased, 1500);
				}
			});
		} catch (err) {
			toast({ variant: 'destructive', title: 'Checkout unavailable', description: err.message });
		} finally { setBusy(false); }
	};

	const features = [
		{ icon: Route, text: '3 AI-curated learning paths — Beginner to Professional' },
		{ icon: BookOpen, text: 'Full course catalog, written for you by AI' },
		{ icon: Video, text: 'Live webinars with an AI host every week' },
		{ icon: Bot, text: 'One-on-one AI tutor inside every lesson' },
		{ icon: Trophy, text: 'AI-graded quizzes and shareable certificates' },
		{ icon: Award, text: 'Lifetime access — one payment, forever' },
	];

	return (
		<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-6 sm:p-10">
			<div className="flex flex-col items-center text-center">
				<div className="flex items-center gap-2 text-[#d4af37]">
					<GraduationCap className="h-6 w-6" />
					<span className="rounded-full bg-[#d4af37]/12 px-3 py-1 text-xs font-semibold uppercase tracking-wider">TradingBible Academy</span>
				</div>
				<h2 className="mt-4 max-w-2xl text-3xl font-bold text-[#f0ecdd] sm:text-4xl">
					The Academy where <span className="gold-text">AI teaches</span> — paths, courses, live sessions.
				</h2>
				<p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">
					Your personal AI builds a learning path around you, writes every lesson, grades every quiz,
					hosts live webinars and tutors you one-on-one. From your first candle to institutional desk strategy.
				</p>

				<div className="mt-6 flex items-end gap-1.5">
					<span className="text-5xl font-bold gold-text">$150</span>
					<span className="mb-1.5 text-sm text-[#8a8577]">one-time · lifetime access</span>
				</div>

				<button
					onClick={buy}
					disabled={busy || (checked && !configured)}
					className="mt-6 flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-8 text-base font-bold text-[#0a0a0f] shadow-[0_0_30px_rgba(212,175,55,0.35)] transition hover:opacity-90 disabled:opacity-60"
				>
					{busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Opening checkout…</> : <><CircleDollarSign className="h-5 w-5" /> Get lifetime access — $150</>}
				</button>
				{checked && !configured && (
					<p className="mt-3 max-w-md text-xs text-[#8a8577]">Checkout will activate once <span className="font-mono text-[#d4af37]">PADDLE_PRICE_ACADEMY</span> is set in <span className="font-mono">apps/api/.env</span> (the $150 one-time price id).</p>
				)}
				<p className="mt-3 text-xs text-[#6a665a]">30-day money-back guarantee · Instant access · A TradingBible LLC education initiative</p>
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
	const [state, setState] = useState({ status: 'loading', content: null, error: '' });
	const [answers, setAnswers] = useState([]);
	const [grade, setGrade] = useState(null);
	const [grading, setGrading] = useState(false);
	const [done, setDone] = useState(progress?.completed);
	const { toast } = useToast();

	useEffect(() => { document.title = `${lesson.title} · Academy`; }, [lesson.title]);

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
			toast({ title: 'Answer every question', description: 'Select an option for each question before grading.' });
			return;
		}
		setGrading(true);
		try {
			const res = await gradeQuiz(pathKey, course.courseKey, lesson.lessonKey, answers);
			setGrade(res);
		} catch (err) {
			toast({ variant: 'destructive', title: 'Could not grade', description: err.message });
		} finally { setGrading(false); }
	};

	const markDone = async () => {
		try {
			await completeLesson(pathKey, course.courseKey, lesson.lessonKey);
			setDone(true);
			onLessonDone();
			toast({ title: 'Lesson complete', description: 'Progress saved.' });
		} catch (err) {
			toast({ variant: 'destructive', title: 'Could not save', description: err.message });
		}
	};

	if (state.status === 'loading') {
		return (
			<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
				<Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
				<p className="mt-4 text-sm text-[#c9c4b4]">Your AI instructor is writing this lesson…</p>
				<p className="mt-1 text-xs text-[#6a665a]">First-time lessons are generated just for you. This can take 20–60 seconds.</p>
			</div>
		);
	}

	if (state.status === 'error') {
		return (
			<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
				<p className="text-sm text-[#e9e7df]">{state.error}</p>
				<button onClick={load} className="mt-4 flex items-center gap-2 rounded-xl border border-[#d4af37]/20 px-4 py-2 text-sm text-[#d4af37] hover:bg-[#d4af37]/10"><RotateCcw className="h-4 w-4" /> Try again</button>
			</div>
		);
	}

	const { content } = state;

	return (
		<div className="space-y-4">
			<button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#8a8577] transition hover:text-[#d4af37]"><ArrowLeft className="h-4 w-4" /> Back to {curriculum.pathName}</button>

			<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
				<div className="flex flex-wrap items-center gap-2 text-xs">
					<span className="rounded-full bg-[#d4af37]/12 px-2.5 py-0.5 text-[#d4af37]">{course.title}</span>
					<span className="flex items-center gap-1 text-[#8a8577]"><Clock className="h-3 w-3" /> {lesson.minutes} min</span>
					{done && <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Completed</span>}
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
					<h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Award className="h-5 w-5 text-[#d4af37]" /> Lesson quiz — graded by AI</h3>
					{grade ? (
						<div className="mt-4">
							<div className={`flex items-center gap-3 rounded-xl p-4 ${grade.score >= Math.ceil(grade.total / 2) ? 'bg-emerald-400/10' : 'bg-[#d4af37]/10'}`}>
								{grade.score >= Math.ceil(grade.total / 2) ? <BadgeCheck className="h-6 w-6 text-emerald-400" /> : <Sparkles className="h-6 w-6 text-[#d4af37]" />}
								<div>
									<p className="font-semibold text-[#f0ecdd]">{grade.score} / {grade.total} correct</p>
									{grade.feedback && <p className="mt-1 text-sm leading-relaxed text-[#c9c4b4]">{grade.feedback}</p>}
								</div>
							</div>
							<div className="mt-4 space-y-4">
								{content.quiz.map((q, qi) => {
									const correct = answers[qi] === q.answerIndex;
									return (
										<div key={qi} className={`rounded-xl border p-4 ${correct ? 'border-emerald-400/25' : answers[qi] === null ? 'border-[#d4af37]/10' : 'border-[#d4af37]/40'}`}>
											<p className="text-sm font-medium text-[#f0ecdd]">{qi + 1}. {q.question}</p>
											<p className="mt-1 text-xs text-[#8a8577]">{correct ? 'Correct' : answers[qi] === null ? 'Skipped' : 'Incorrect'} — {q.explanation}</p>
										</div>
									);
								})}
							</div>
							<button onClick={() => { setGrade(null); setAnswers(Array(content.quiz.length).fill(null)); }} className="mt-4 flex items-center gap-2 rounded-xl border border-[#d4af37]/20 px-4 py-2 text-sm text-[#d4af37] hover:bg-[#d4af37]/10"><RotateCcw className="h-4 w-4" /> Retake</button>
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
								{grading ? <><Loader2 className="h-4 w-4 animate-spin" /> AI is grading…</> : <>Submit for AI grading</>}
							</button>
						</div>
					)}
				</div>
			)}

			{!done && (
				<div className="flex justify-end">
					<button onClick={markDone} className="flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-6 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">
						<CheckCircle2 className="h-4 w-4" /> Mark lesson complete
					</button>
				</div>
			)}

			<div>
				<h3 className="mb-3 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Bot className="h-5 w-5 text-[#d4af37]" /> Your AI tutor</h3>
				<AIChat
					endpoint="/academy/tutor/stream"
					placeholder="AI Tutor"
					buildBody={({ history, question }) => ({ pathKey, courseKey: course.courseKey, lessonKey: lesson.lessonKey, history, question })}
				/>
			</div>
		</div>
	);
}

// ── Curriculum (enrolled path) ───────────────────────────────────────
function CurriculumView({ pathKey, curriculum, progressMap, onOpenLesson, onLeave, certificate }) {
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
					</div>
					<button onClick={onLeave} className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/20 px-3.5 py-2 text-xs text-[#8a8577] hover:text-[#d4af37]"><ArrowLeft className="h-3.5 w-3.5" /> All paths</button>
				</div>
				<div className="mt-4">
					<div className="flex items-center justify-between text-xs text-[#8a8577]">
						<span>{completed} / {totalLessons} lessons</span>
						<span>{pct}%</span>
					</div>
					<div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#d4af37]/10">
						<div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] transition-all" style={{ width: `${pct}%` }} />
					</div>
				</div>
			</div>

			{certificate && (
				<div className="rounded-2xl border border-[#d4af37]/25 bg-gradient-to-br from-[#d4af37]/[0.1] via-[#d4af37]/[0.04] to-transparent p-5 sm:p-6">
					<div className="flex flex-wrap items-center gap-3">
						<Trophy className="h-8 w-8 text-[#d4af37]" />
						<div className="min-w-0 flex-1">
							<h3 className="font-bold text-[#f0ecdd]">Certified — {curriculum.pathName}</h3>
							<p className="mt-1 text-xs text-[#8a8577]">Code: <span className="font-mono text-[#d4af37]">{certificate.code}</span></p>
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
								<span className="text-xs text-[#8a8577]">{done}/{course.lessons.length} · {course.minutes} min</span>
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
													<span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {l.minutes} min</span>
													{prog?.quizScore !== null && prog?.quizScore !== undefined && <span>· Quiz {prog.quizScore}/{prog.quizTotal}</span>}
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

// ── Main page ────────────────────────────────────────────────────────
export default function AcademyPage() {
	const { toast } = useToast();
	const [access, setAccess] = useState(null); // null = loading
	const [data, setData] = useState(null);
	const [view, setView] = useState('paths'); // paths | curriculum | lesson
	const [activePath, setActivePath] = useState(null);
	const [activeCourse, setActiveCourse] = useState(null);
	const [activeLesson, setActiveLesson] = useState(null);
	const [generating, setGenerating] = useState(null); // pathKey being generated
	const [rsvps, setRsvps] = useState([]);
	const [tab, setTab] = useState('learn');

	const refreshAccess = useCallback(async () => {
		try {
			const res = await getAcademyAccess();
			setAccess(res.access);
			if (res.access) refreshProgress();
		} catch {
			setAccess(false);
		}
	}, []);

	const refreshProgress = useCallback(async () => {
		try {
			const res = await getAcademyProgress();
			setData(res);
			setRsvps(res.rsvps || []);
		} catch (err) {
			toast({ variant: 'destructive', title: 'Could not load Academy', description: err.message });
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
			toast({ variant: 'destructive', title: 'Could not enroll', description: err.message });
			setGenerating(null);
		}
	};

	const pollCurriculum = async (path, attempt = 0) => {
		try {
			const res = await getCurriculum(path.key, path.level);
			if (res.status === 'generating') {
				if (attempt > 40) { setGenerating(null); toast({ title: 'Still writing…', description: 'The AI is taking a while. You can refresh in a minute.' }); return; }
				setTimeout(() => pollCurriculum(path, attempt + 1), 3000);
				return;
			}
			setGenerating(null);
			await refreshProgress();
		} catch (err) {
			setGenerating(null);
			toast({ variant: 'destructive', title: 'Could not build your curriculum', description: err.message });
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
			toast({ variant: 'destructive', title: 'RSVP failed', description: err.message });
		}
	};

	const doClaimCertificate = async (pathKey) => {
		try {
			await claimCertificate(pathKey);
			await refreshProgress();
			toast({ title: 'Certificate issued', description: 'Your shareable certificate is ready.' });
		} catch (err) {
			toast({ variant: 'destructive', title: 'Certificate unavailable', description: err.message });
		}
	};

	// ── Not purchased → paywall ──
	if (access === false) {
		return (
			<AppLayout title="Academy">
				<Paywall onPurchased={() => { toast({ title: 'Welcome to the Academy', description: 'Your lifetime access is active. The AI is building your path.' }); refreshAccess(); }} />
			</AppLayout>
		);
	}

	if (access === null || !data) {
		return (
			<AppLayout title="Academy">
				<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
					<Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
					<p className="mt-4 text-sm text-[#c9c4b4]">Loading your Academy…</p>
				</div>
			</AppLayout>
		);
	}

	const enrolled = data.enrollments || [];
	const liveWebinars = WEBINAR_SCHEDULE.map((w) => ({ ...w, state: getWebinarState(w) }));

	// ── Lesson view ──
	if (view === 'lesson' && activePath && activeCourse && activeLesson) {
		return (
			<AppLayout title="Academy">
				<LessonView
					pathKey={activePath.key}
					curriculum={curriculumFor(activePath.key) || { pathName: activePath.name, courses: [] }}
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
		const curriculum = curriculumFor(activePath.key);
		const certificate = enrollmentFor(activePath.key);
		return (
			<AppLayout title="Academy">
				{!curriculum || generating ? (
					<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
						<div className="relative">
							<Route className="h-10 w-10 animate-pulse text-[#d4af37]" />
							<Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 animate-spin text-[#d4af37]" />
						</div>
						<p className="mt-4 font-semibold text-[#f0ecdd]">The AI is designing your {activePath.name} curriculum…</p>
						<p className="mt-1 max-w-md text-xs leading-relaxed text-[#6a665a]">It personalizes the path for your level, writes every course and lesson, and caches it for you. This can take up to a minute.</p>
					</div>
				) : (
					<CurriculumView
						pathKey={activePath.key}
						curriculum={curriculum}
						progressMap={progressMap}
						certificate={certificate}
						onOpenLesson={openLesson}
						onLeave={() => { setView('paths'); setActivePath(null); }}
					/>
				)}
			</AppLayout>
		);
	}

	// ── Dashboard ──
	return (
		<AppLayout title="Academy">
			{/* Tabs */}
			<div className="mb-5 flex flex-wrap gap-2">
				{[
					{ id: 'learn', icon: GraduationCap, label: 'Learn' },
					{ id: 'webinars', icon: Video, label: 'Live Webinars' },
					{ id: 'certificates', icon: Award, label: 'Certificates' },
				].map((t) => (
					<button key={t.id} onClick={() => setTab(t.id)}
						className={`flex min-h-[42px] items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${tab === t.id ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'border border-[#d4af37]/20 text-[#8a8577] hover:text-[#e9e7df]'}`}>
						<t.icon className="h-4 w-4" /> {t.label}
					</button>
				))}
			</div>

			{tab === 'learn' && (
				<>
					<div className="tint-hero mb-6 rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div>
								<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#d4af37]"><Sparkles className="h-4 w-4" /> AI-driven curriculum</div>
								<h2 className="mt-1.5 text-xl font-bold text-[#f0ecdd] sm:text-2xl">Pick a path — the AI builds it around you</h2>
								<p className="mt-1 max-w-xl text-sm text-[#8a8577]">Each path becomes a personalized curriculum: courses, lessons, quizzes and certificates generated for your level.</p>
							</div>
							{enrolled.length > 0 && (
								<div className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14]/40 px-4 py-3 text-right">
									<p className="text-xs text-[#8a8577]">Overall progress</p>
									<p className="mt-0.5 font-bold text-[#d4af37]">{(() => {
										let done = 0, total = 0;
										enrolled.forEach((e) => {
											const c = curriculumFor(e.pathKey);
											if (!c) return;
											total += c.courses.reduce((a, co) => a + co.lessons.length, 0);
											done += c.courses.reduce((a, co) => a + co.lessons.filter((l) => progressMap[`${co.courseKey}:${l.lessonKey}`]?.completed).length, 0);
										});
										return total ? `${Math.round((done / total) * 100)}%` : '0%';
									})()}</p>
								</div>
							)}
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						{PATHS.map((p) => {
							const isEnrolled = enrolled.some((e) => e.pathKey === p.key);
							const curriculum = curriculumFor(p.key);
							const cert = enrollmentFor(p.key);
							const lessons = curriculum?.courses.reduce((a, c) => a + c.lessons.length, 0) || 0;
							const done = curriculum ? curriculum.courses.reduce((a, c) => a + c.lessons.filter((l) => progressMap[`${c.courseKey}:${l.lessonKey}`]?.completed).length, 0) : 0;
							const pct = lessons ? Math.round((done / lessons) * 100) : 0;
							return (
								<div key={p.key} className="glass glass-hover relative flex h-full flex-col rounded-2xl p-5">
									<div className="flex items-center gap-2">
										<Route className="h-4 w-4" style={{ color: p.color }} />
										<span className="text-xs font-semibold uppercase tracking-wide" style={{ color: p.color }}>{p.level} Path</span>
									</div>
									<h3 className="mt-2 font-semibold text-[#f0ecdd]">{p.name}</h3>
									<p className="mt-1 flex-1 text-sm leading-relaxed text-[#8a8577]">{p.desc}</p>
									{isEnrolled && lessons > 0 && (
										<div className="mt-3">
											<div className="flex justify-between text-[11px] text-[#8a8577]"><span>{done}/{lessons} lessons</span><span>{pct}%</span></div>
											<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#d4af37]/10"><div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25]" style={{ width: `${pct}%` }} /></div>
										</div>
									)}
									<div className="mt-4 flex items-center gap-2">
										{isEnrolled ? (
											<button onClick={() => { setActivePath(p); setView('curriculum'); }} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">
												{cert?.certificateCode ? <><BadgeCheck className="h-4 w-4" /> Certified</> : pct === 100 ? <><Award className="h-4 w-4" /> Claim certificate</> : <><PlayCircle className="h-4 w-4" /> Continue</>}
											</button>
										) : (
											<button onClick={() => enroll(p)} disabled={generating === p.key}
												className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 px-4 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:opacity-50">
												{generating === p.key ? <><Loader2 className="h-4 w-4 animate-spin" /> Enrolling…</> : <><Rocket className="h-4 w-4" /> Enroll</>}
											</button>
										)}
									</div>
									{isEnrolled && !cert?.certificateCode && pct === 100 && (
										<button onClick={() => doClaimCertificate(p.key)} className="mt-2 min-h-[44px] w-full rounded-xl border border-[#d4af37]/25 px-4 text-sm font-semibold text-[#f4e6a8] transition hover:bg-[#d4af37]/10">Claim AI certificate</button>
									)}
								</div>
							);
						})}
					</div>
				</>
			)}

			{tab === 'webinars' && (
				<div className="space-y-5">
					<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#d4af37]"><Radio className="h-4 w-4" /> Live &amp; interactive</div>
						<h2 className="mt-1.5 text-xl font-bold text-[#f0ecdd] sm:text-2xl">Live webinars hosted by AI</h2>
						<p className="mt-1 max-w-xl text-sm text-[#8a8577]">Weekly sessions on market opens, journal reviews, risk and strategy. When a session is live, the AI host is in the room answering questions in real time.</p>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						{liveWebinars.map((w) => {
							const { live, start } = w.state;
							const rsvped = rsvps.includes(w.id);
							return (
								<div key={w.id} className={`glass h-full rounded-2xl p-5 ${live ? 'border border-[#34d399]/30' : ''}`}>
									<div className="flex items-center gap-2">
										{live
											? <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live now</span>
											: <span className="rounded-full bg-[#d4af37]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#d4af37]">{WEEKDAYS[w.day]} · {w.hour % 12 || 12}:00 {w.hour >= 12 ? 'PM' : 'AM'} EST</span>}
									</div>
									<h3 className="mt-2.5 font-semibold text-[#f0ecdd]">{w.title}</h3>
									<p className="mt-1 text-xs text-[#8a8577]">{w.host}</p>
									<p className="mt-2 text-sm leading-relaxed text-[#c9c4b4]">{w.description}</p>
									<div className="mt-3 flex items-center gap-2 text-xs text-[#8a8577]">
										{live ? <span className="flex items-center gap-1 text-emerald-400"><Radio className="h-3.5 w-3.5" /> Session in progress — join the room below</span>
											: <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Starts in {fmtCountdown(start)}</span>}
									</div>
									<button onClick={() => toggleRsvp(w.id)}
										className={`mt-4 min-h-[42px] w-full rounded-xl border px-4 text-sm font-semibold transition ${rsvped ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' : 'border-[#d4af37]/25 text-[#d4af37] hover:bg-[#d4af37]/10'}`}>
										{rsvped ? <><CheckCircle2 className="mr-1.5 inline h-4 w-4" /> You're on the list</> : 'RSVP'}
									</button>
								</div>
							);
						})}
					</div>

					{liveWebinars.find((w) => w.state.live) ? (
						<div>
							<h3 className="mb-3 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Radio className="h-5 w-5 text-emerald-400" /> Live room</h3>
							<AIChat
								endpoint="/academy/webinar/stream"
								placeholder="AI Host · Live room"
								accent="#34d399"
								buildBody={({ history, question }) => ({
									webinar: liveWebinars.find((w) => w.state.live),
									scheduleNote: 'LIVE session — attendees are joining now.',
									history,
									question,
								})}
							/>
						</div>
					) : (
						<div className="glass flex items-center gap-3 rounded-2xl p-5">
							<Calendar className="h-6 w-6 text-[#d4af37]" />
							<p className="text-sm text-[#c9c4b4]">The next live session starts in <span className="font-semibold text-[#f0ecdd]">{fmtCountdown(liveWebinars.reduce((a, w) => (w.state.start.getTime() < a.state.start.getTime() ? w : a)).state.start)}</span>. RSVP above and we'll see you in the room — the AI host takes questions live.</p>
						</div>
					)}
				</div>
			)}

			{tab === 'certificates' && (
				<div className="space-y-4">
					<div className="tint-hero rounded-2xl border border-[#d4af37]/15 p-5 sm:p-6">
						<h2 className="text-xl font-bold text-[#f0ecdd] sm:text-2xl"><Award className="mr-2 inline h-6 w-6 text-[#d4af37]" />Your certificates</h2>
						<p className="mt-1 max-w-xl text-sm text-[#8a8577]">Finish every lesson in a path and the AI writes you a personalized citation with a verifiable certificate code.</p>
					</div>
					{enrolled.length === 0 ? (
						<div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
							<Award className="h-10 w-10 text-[#6a665a]" />
							<p className="mt-3 text-sm text-[#c9c4b4]">Enroll in a learning path to start earning certificates.</p>
						</div>
					) : enrolled.map((e) => {
						const p = PATHS.find((x) => x.key === e.pathKey);
						const curriculum = curriculumFor(e.pathKey);
						const lessons = curriculum?.courses.reduce((a, c) => a + c.lessons.length, 0) || 0;
						const done = curriculum ? curriculum.courses.reduce((a, c) => a + c.lessons.filter((l) => progressMap[`${c.courseKey}:${l.lessonKey}`]?.completed).length, 0) : 0;
						const pct = lessons ? Math.round((done / lessons) * 100) : 0;
						return (
							<div key={e.pathKey} className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
								<div className="flex items-center gap-3">
									<div className="grid h-11 w-11 place-items-center rounded-full bg-[#d4af37]/12 text-[#d4af37]">{e.certificateCode ? <Trophy className="h-5 w-5" /> : <Lock className="h-5 w-5" />}</div>
									<div>
										<p className="font-semibold text-[#f0ecdd]">{p?.name || e.pathKey}</p>
										<p className="text-xs text-[#8a8577]">{e.certificateCode ? <span>Code <span className="font-mono text-[#d4af37]">{e.certificateCode}</span> · {new Date(e.certificateGeneratedAt).toLocaleDateString()}</span> : `${done}/${lessons} lessons · ${pct}%`}</p>
									</div>
								</div>
								{e.certificateCode
									? <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-400"><BadgeCheck className="h-4 w-4" /> Certified</span>
									: <button onClick={() => doClaimCertificate(e.pathKey)} disabled={pct < 100}
										className="min-h-[42px] rounded-xl border border-[#d4af37]/25 px-4 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:cursor-not-allowed disabled:opacity-40">
										{pct < 100 ? `Complete ${100 - pct}% more` : 'Claim certificate'}
									</button>}
							</div>
						);
					})}
				</div>
			)}

			<div className="mt-8 flex flex-col items-center rounded-2xl border border-[#d4af37]/15 p-6 text-center sm:flex-row sm:justify-between sm:p-8 sm:text-left">
				<div className="flex items-center gap-4">
					<Bot className="h-10 w-10 shrink-0 text-[#d4af37]" />
					<div>
						<h3 className="font-semibold text-[#f0ecdd]">Your AI runs the whole academy</h3>
						<p className="text-sm text-[#8a8577]">It designs your path, writes every lesson, grades every quiz, hosts every webinar and tutors you one-on-one.</p>
					</div>
				</div>
				<button onClick={() => setTab('learn')} className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-3 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 sm:mt-0"><MessageSquare className="h-4 w-4" /> Start learning</button>
			</div>
		</AppLayout>
	);
}
