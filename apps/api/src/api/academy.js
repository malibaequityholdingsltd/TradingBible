// TradingBible Academy — AI orchestration + data access.
// The AI is in charge of everything: it designs the learning path, writes
// every lesson, builds and grades quizzes, hosts live webinars and tutors
// students. Generated content is cached per user so the AI only runs once
// per piece of content.

import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';
import { generateText, stream } from './integrated-ai.js';
import {
	AcademyCertificatePrompt,
	AcademyCurriculumPrompt,
	AcademyGradePrompt,
	AcademyLessonPrompt,
	AcademyTutorPrompt,
	AcademyWebinarHostPrompt,
} from '../constants/prompts.js';

const textBlock = (text) => ({ type: 'text', text });

function extractJson(raw) {
	if (!raw) return null;
	let text = String(raw).trim();
	// strip markdown fences
	text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end <= start) return null;
	try {
		return JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
}

// ── Default curriculum (fallback if the AI is unavailable) ──────────
const DEFAULT_CURRICULUM = {
	pathName: 'The Disciplined Trader',
	focus: 'A complete A–Z trading education: markets, risk, analysis and execution.',
	courses: [
		{
			courseKey: 'markets-foundations',
			title: 'Markets & Foundations',
			minutes: 65,
			description: 'How markets work and the assets you trade — Gold, Bitcoin, Forex, Crypto, Commodities and Indices.',
			lessons: [
				{ lessonKey: 'what-is-trading', title: 'What trading really is', minutes: 12 },
				{ lessonKey: 'market-structure', title: 'Market structure and participants', minutes: 14 },
				{ lessonKey: 'asset-classes', title: 'The asset classes you can trade', minutes: 18 },
				{ lessonKey: 'how-prices-move', title: 'How prices move: supply, demand and liquidity', minutes: 21 },
			],
		},
		{
			courseKey: 'risk-first',
			title: 'Risk Management First',
			minutes: 70,
			description: 'Protect capital before anything else: sizing, stops and risk/reward.',
			lessons: [
				{ lessonKey: 'position-sizing', title: 'Position sizing fundamentals', minutes: 16 },
				{ lessonKey: 'stops-losses', title: 'Stop losses done right', minutes: 15 },
				{ lessonKey: 'risk-reward', title: 'Risk/reward and expectancy', minutes: 19 },
				{ lessonKey: 'max-drawdown', title: 'Drawdown control and discipline', minutes: 20 },
			],
		},
		{
			courseKey: 'technical-analysis',
			title: 'Technical Analysis',
			minutes: 76,
			description: 'Candlesticks, support and resistance, trends and confluence.',
			lessons: [
				{ lessonKey: 'candlesticks', title: 'Reading candlesticks', minutes: 18 },
				{ lessonKey: 'support-resistance', title: 'Support and resistance', minutes: 17 },
				{ lessonKey: 'trends', title: 'Trends, structure and swing points', minutes: 20 },
				{ lessonKey: 'confluence', title: 'Building a confluence checklist', minutes: 21 },
			],
		},
		{
			courseKey: 'psychology-execution',
			title: 'Psychology & Execution',
			minutes: 66,
			description: 'The mindset and process that keep you consistent.',
			lessons: [
				{ lessonKey: 'trading-plan', title: 'Building a trading plan', minutes: 16 },
				{ lessonKey: 'emotions', title: 'Emotions and tilt control', minutes: 15 },
				{ lessonKey: 'journaling', title: 'Journaling every trade', minutes: 17 },
				{ lessonKey: 'review', title: 'Weekly review cadence', minutes: 18 },
			],
		},
	],
};

// ── Data access (service role, camelCase columns) ───────────────────

const upsert = (table, row, conflict) =>
	supabaseRest(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
		method: 'POST',
		body: row,
		prefer: 'resolution=merge-duplicates,return=representation',
	}).then((rows) => rows?.[0] || null);

const selectWhere = (table, where, extra = '') =>
	supabaseRest(`/rest/v1/${table}?${where}${extra ? `&${extra}` : ''}`, { prefer: 'return=representation' });

export const academyDb = {
	getUser: (id) =>
		supabaseRest(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, { query: { select: '*', limit: 1 } })
			.then((rows) => rows?.[0] || null),
	grantAccess: (id, at) =>
		supabaseRest(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, {
			method: 'PATCH',
			body: { academyAccess: true, academyPurchasedAt: at || new Date().toISOString() },
			prefer: 'return=representation',
		}).then((rows) => rows?.[0] || null),

	getCurriculum: (owner, pathKey) =>
		selectWhere('academy_curricula', `owner=eq.${owner}&pathKey=eq.${encodeURIComponent(pathKey)}`).then((r) => r?.[0] || null),
	saveCurriculum: (owner, pathKey, curriculum) =>
		upsert('academy_curricula', { owner, pathKey, curriculum, updatedAt: new Date().toISOString() }, 'owner,pathKey'),

	getLesson: (owner, pathKey, courseKey, lessonKey) =>
		selectWhere(
			'academy_lessons',
			`owner=eq.${owner}&pathKey=eq.${encodeURIComponent(pathKey)}&courseKey=eq.${encodeURIComponent(courseKey)}&lessonKey=eq.${encodeURIComponent(lessonKey)}`,
		).then((r) => r?.[0] || null),
	saveLesson: (owner, pathKey, courseKey, lessonKey, content) =>
		upsert('academy_lessons', { owner, pathKey, courseKey, lessonKey, content, updatedAt: new Date().toISOString() }, 'owner,pathKey,courseKey,lessonKey'),

	getEnrollment: (owner, pathKey) =>
		selectWhere('academy_enrollments', `owner=eq.${owner}&pathKey=eq.${encodeURIComponent(pathKey)}`).then((r) => r?.[0] || null),
	createEnrollment: (owner, pathKey) =>
		upsert('academy_enrollments', { owner, pathKey, enrolledAt: new Date().toISOString() }, 'owner,pathKey'),
	updateEnrollment: (owner, pathKey, patch) =>
		selectWhere('academy_enrollments', `owner=eq.${owner}&pathKey=eq.${encodeURIComponent(pathKey)}`, 'select=*').then(() =>
			upsert('academy_enrollments', { owner, pathKey, ...patch }, 'owner,pathKey'),
		),
	listEnrollments: (owner) => selectWhere('academy_enrollments', `owner=eq.${owner}`),
	listCurricula: (owner) => selectWhere('academy_curricula', `owner=eq.${owner}`),
	listProgress: (owner) => selectWhere('academy_progress', `owner=eq.${owner}`),

	upsertProgress: (owner, row) =>
		upsert('academy_progress', { owner, ...row }, 'owner,pathKey,courseKey,lessonKey'),
	listRsvps: (owner) => selectWhere('academy_webinar_rsvps', `owner=eq.${owner}`),
	upsertRsvp: (owner, webinarId) =>
		upsert('academy_webinar_rsvps', { owner, webinarId, rsvpAt: new Date().toISOString() }, 'owner,webinarId'),
	deleteRsvp: (owner, webinarId) =>
		supabaseRest(`/rest/v1/academy_webinar_rsvps?owner=eq.${owner}&webinarId=eq.${encodeURIComponent(webinarId)}`, { method: 'DELETE' }),
	createPurchase: (row) =>
		supabaseRest('/rest/v1/academy_purchases', { method: 'POST', body: row, prefer: 'return=representation' }),
};

// ── AI generation ────────────────────────────────────────────────────

async function aiJson({ systemPrompt, userMessage, fallback, label }) {
	try {
		const raw = await generateText({ systemPrompt, userMessage });
		const parsed = extractJson(raw);
		if (!parsed) {
			logger.warn(`academy ${label}: AI returned non-JSON, using fallback`);
			return fallback;
		}
		return parsed;
	} catch (err) {
		logger.error(`academy ${label} failed`, String(err?.message || err));
		return fallback;
	}
}

export async function generateCurriculum({ userId, level, about }) {
	const curriculum = await aiJson({
		systemPrompt: AcademyCurriculumPrompt(level || 'Beginner', about || ''),
		userMessage: [textBlock(`Please design my personalized learning path.`)],
		fallback: DEFAULT_CURRICULUM,
		label: 'curriculum',
	});
	return {
		pathName: curriculum.pathName || DEFAULT_CURRICULUM.pathName,
		focus: curriculum.focus || DEFAULT_CURRICULUM.focus,
		courses: Array.isArray(curriculum.courses) && curriculum.courses.length
			? curriculum.courses.map((c) => ({
					courseKey: String(c.courseKey || '').toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'course',
					title: c.title || 'Untitled course',
					minutes: Number(c.minutes) || 0,
					description: c.description || '',
					lessons: (Array.isArray(c.lessons) ? c.lessons : []).map((l) => ({
						lessonKey: String(l.lessonKey || '').toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'lesson',
						title: l.title || 'Untitled lesson',
						minutes: Number(l.minutes) || 0,
					})),
			  }))
			: DEFAULT_CURRICULUM.courses,
	};
}

export async function generateLessonContent({ curriculum, course, lesson }) {
	const lessonCtx = `Path: ${curriculum.pathName}\nCourse: ${course.title}\nLesson: ${lesson.title} (${lesson.minutes} min)`;
	const content = await aiJson({
		systemPrompt: AcademyLessonPrompt(
			`Path: ${curriculum.pathName}. Focus: ${curriculum.focus || ''}.`,
			lessonCtx,
		),
		userMessage: [textBlock(`Write this lesson.`)],
		fallback: {
			title: lesson.title,
			summary: `AI generated this lesson's content for you.`,
			keyPoints: ['Trade with a plan', 'Manage risk first', 'Review every trade'],
			content: `## ${lesson.title}\n\nThis lesson is part of ${course.title} in the ${curriculum.pathName} path.\n\nYour AI instructor is preparing the full lesson. Try again in a moment to load the complete content.`,
			quiz: [
				{
					question: `What is the most important rule of trading?`,
					options: ['Protect your capital first', 'Win every trade', 'Trade as often as possible', 'Ignore risk'],
					answerIndex: 0,
					explanation: 'Capital preservation is the foundation of every profitable trader.',
				},
			],
		},
		label: 'lesson',
	});
	const result = {
		title: content.title || lesson.title,
		summary: content.summary || '',
		keyPoints: Array.isArray(content.keyPoints) ? content.keyPoints.slice(0, 6) : [],
		content: String(content.content || ''),
		quiz: Array.isArray(content.quiz)
			? content.quiz.slice(0, 6).map((q) => ({
					question: q.question || '',
					options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['', '', '', ''],
					answerIndex: Number(q.answerIndex) >= 0 && Number(q.answerIndex) < 4 ? Number(q.answerIndex) : 0,
					explanation: q.explanation || '',
			  }))
			: [],
	};
	// Verification pass: the generator occasionally mislabels the correct
	// option index. Have the AI audit the quiz and replace the answer keys
	// so grading stays consistent. Falls back to the generated keys.
	if (result.quiz.length) {
		try {
			const quizJson = result.quiz.map((q) => ({ question: q.question, options: q.options })).map((q) => `Q: ${q.question}\nOptions: ${q.options.map((o, i) => `${i}. ${o}`).join(' | ')}`).join('\n\n');
			const verified = await aiJson({
				systemPrompt: `You are a quiz auditor. For each question below, determine the single objectively correct option index (0-3) based on general trading knowledge. Return ONLY strict JSON: { "answers": [0, 2, ...] } with one index per question, in order. No commentary.`,
				userMessage: [textBlock(quizJson)],
				fallback: null,
				label: 'quiz-verify',
			});
			if (Array.isArray(verified?.answers) && verified.answers.length === result.quiz.length) {
				result.quiz.forEach((q, i) => {
					const idx = Number(verified.answers[i]);
					if (Number.isInteger(idx) && idx >= 0 && idx < 4) q.answerIndex = idx;
				});
			}
		} catch (err) {
			logger.warn('academy quiz verification skipped', String(err?.message || err));
		}
	}
	return result;
}

export async function gradeQuiz({ lesson, answers }) {
	const safeAnswers = Array.isArray(answers) ? answers : [];
	const directScore = lesson.quiz.reduce((acc, q, i) => {
		const chosen = Number(safeAnswers[i]);
		return acc + (chosen === q.answerIndex ? 1 : 0);
	}, 0);
	const result = await aiJson({
		systemPrompt: AcademyGradePrompt(
			`Lesson: ${lesson.title}\nQuiz:\n${lesson.quiz.map((q, i) => `Q${i + 1}: ${q.question}\nCorrect: ${q.answerIndex}\nExplanation: ${q.explanation}`).join('\n')}`,
			`Student answers: ${safeAnswers.map((a, i) => `Q${i + 1}: option ${a}`).join(', ')}`,
		),
		userMessage: [textBlock(`Grade this quiz.`)],
		fallback: { score: directScore, feedback: '' },
		label: 'grade',
	});
	const score = Number(result?.score);
	return {
		score: Number.isInteger(score) && score >= 0 ? Math.min(score, lesson.quiz.length) : directScore,
		feedback: String(result?.feedback || ''),
	};
}

export async function generateCertificate({ pathName, stats }) {
	try {
		const text = await generateText({
			systemPrompt: AcademyCertificatePrompt(pathName, stats),
			userMessage: [textBlock('Write my certificate citation.')],
		});
		return cleanCertificateCitation(String(text || ''));
	} catch (err) {
		logger.error('academy certificate failed', String(err?.message || err));
		return '';
	}
}

// The assistant sometimes wraps the citation in meta-commentary
// ("The user wants a certificate citation..."). Drop the chatter, keep
// the actual citation paragraph.
function cleanCertificateCitation(text) {
	const paras = String(text)
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter(Boolean);
	const meta = /^(the user|as the|i should|this is|you are|per the|the system|ok(ay)?[,!.]|sure|here['’]s|let me)/i;
	const citation = paras.filter((p) => !meta.test(p)).join('\n\n') || text;
	return citation.trim().slice(0, 900);
}

export function tutorStream({ userId, lesson, progressNote, history, question }) {
	const recent = (Array.isArray(history) ? history : []).slice(-8)
		.map((m) => `${m?.role}: ${m?.content}`)
		.join('\n');
	const prompt = AcademyTutorPrompt(lesson.title, lesson.content, progressNote);
	const userMessage = [
		...(recent ? [textBlock(`Conversation so far:\n${recent}`)] : []),
		textBlock(`Student question: ${question}`),
	];
	return stream({ userId, systemPrompt: prompt, userMessage });
}

export function webinarStream({ userId, webinar, scheduleNote, history, question }) {
	const recent = (Array.isArray(history) ? history : []).slice(-8)
		.map((m) => `${m?.role}: ${m?.content}`)
		.join('\n');
	const userMessage = [
		...(recent ? [textBlock(`Room chat so far:\n${recent}`)] : []),
		textBlock(question ? `Attendee: ${question}` : 'Open the session for today.'),
	];
	return stream({
		userId,
		systemPrompt: AcademyWebinarHostPrompt(webinar, scheduleNote),
		userMessage,
	});
}
