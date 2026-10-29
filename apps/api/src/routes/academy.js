import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { endSse, openSse, withTimeout } from '../utils/sse.js';
import {
	academyDb,
	generateCertificate,
	generateCurriculum,
	generateLessonContent,
	generateLessonQuiz,
	gradeQuiz,
	isLessonTranslationLang,
	stripStreamNarration,
	translateLessonContent,
	tutorStream,
	webinarStream,
} from '../api/academy.js';

const router = Router();

function siSetupTimeoutMs() {
	const configured = Number(process.env.SI_STREAM_SETUP_TIMEOUT_MS);
	if (!Number.isFinite(configured) || configured <= 0) return 75000;
	return Math.min(90000, Math.max(15000, configured));
}

const academyAiRateLimit = rateLimit({
	windowMs: 60 * 1000,
	max: 15,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many Academy requests, please try again later' },
	validate: { trustProxy: false },
});

router.use(supabaseAuth);

async function requireAccess(req, res, next) {
	try {
		const user = await academyDb.getUser(req.userId);
		// Admins always pass: only the $150 purchase (or an admin role)
		// unlocks the Academy — no other bypass exists.
		if (!user?.academyAccess && user?.role !== 'admin') {
			return res.status(403).json({ error: { message: 'not_purchased', code: 'academy_access_required' } });
		}
		req.academyUser = user;
		next();
	} catch (err) {
		logger.error('academy access check failed', String(err?.message || err));
		return res.status(500).json({ error: { message: 'Could not verify Academy access.' } });
	}
}

// ── Access ──────────────────────────────────────────────────────────
router.get('/access', async (req, res) => {
	try {
		const user = await academyDb.getUser(req.userId);
		const access = Boolean(user?.academyAccess || user?.role === 'admin');
		res.json({ access, purchasedAt: user?.academyPurchasedAt || null });
	} catch (err) {
		logger.error('academy access failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not check Academy access.' } });
	}
});

// Everything below requires a purchased Academy membership.
router.use(requireAccess);

// ── Final certificate exam ──────────────────────────────────────────
// Questions are generated with each lesson and stored server-side, but they
// are never returned while the student is learning. The exam is assembled
// once every lesson is complete, so the only questions a student sees are
// the certificate exam questions.
const EXAM_COURSE = '__final-exam';
const EXAM_LESSON = 'certificate';
const EXAM_PASS_PERCENT = 80;
const EXAM_MAX_QUESTIONS = 20;

function lessonForStudent(content) {
	if (!content || typeof content !== 'object') return content;
	const { quiz, translations, ...rest } = content;
	return { ...rest, translatedLangs: Object.keys(translations || {}) };
}

// A provider outage used to be cached as a "lesson" that told the student to
// come back later. Treat those rows as misses so the next open retries the
// writer, and never let them become exam questions.
function isPlaceholderLesson(content) {
	const text = String(content?.content || '');
	if (!text.trim()) return true;
	if (/preparing the full lesson|SI generated this lesson's content/i.test(text)) return true;
	if (/AI generated this lesson's content/i.test(String(content?.summary || ''))) return true;
	return false;
}

// Lesson notes are the user-facing deliverable. Exam questions are generated
// separately, after the lesson response, so a slow CPU-only model never blocks
// reading and never leaks a question into the learning view.
const quizGenerating = new Set();

function queueLessonQuiz({ userId, pathKey, courseKey, lessonKey, content }) {
	if (Array.isArray(content?.quiz) && content.quiz.length) return;
	if (isPlaceholderLesson(content)) return;
	const key = `${userId}:${pathKey}:${courseKey}:${lessonKey}`;
	if (quizGenerating.has(key)) return;
	quizGenerating.add(key);
	generateLessonQuiz({ lesson: { title: content.title || lessonKey }, content })
		.then(async (quiz) => {
			if (!Array.isArray(quiz) || !quiz.length) return;
			const current = await academyDb.getLesson(userId, pathKey, courseKey, lessonKey);
			const latest = current?.content || content;
			if (isPlaceholderLesson(latest)) return;
			await academyDb.saveLesson(userId, pathKey, courseKey, lessonKey, { ...latest, quiz });
			logger.info('academy exam question prepared', `${pathKey}/${courseKey}/${lessonKey}`);
		})
		.catch((err) => logger.error('academy quiz generation failed', String(err?.message || err)))
		.finally(() => quizGenerating.delete(key));
}

// One generation per user/lesson, shared by the active read request and the
// client's background prefetch of the next lesson. Without this, opening the
// next lesson while it is still being prefetched started a second CPU-heavy
// generation and made the wait worse.
const lessonGenerating = new Map();

function generateAndCacheLesson({ userId, pathKey, courseKey, lessonKey, curriculum, course, lesson }) {
	const key = `${userId}:${pathKey}:${courseKey}:${lessonKey}`;
	if (lessonGenerating.has(key)) return lessonGenerating.get(key);
	const promise = (async () => {
		const content = await generateLessonContent({ curriculum, course, lesson });
		if (isPlaceholderLesson(content)) {
			const err = new Error('The SI could not write this lesson yet. Please try again in a moment.');
			err.status = 503;
			err.code = 'lesson_generation_failed';
			throw err;
		}
		await academyDb.saveLesson(userId, pathKey, courseKey, lessonKey, content);
		queueLessonQuiz({ userId, pathKey, courseKey, lessonKey, content });
		return content;
	})().finally(() => {
		lessonGenerating.delete(key);
	});
	lessonGenerating.set(key, promise);
	return promise;
}

function buildFinalExam(curriculum, lessonRows) {
	const cached = new Map(
		(lessonRows || []).map((row) => [`${row.courseKey}::${row.lessonKey}`, row.content]),
	);
	const pool = [];
	let courseIndex = 0;
	for (const course of curriculum?.courses || []) {
		let lessonIndex = 0;
		for (const lesson of course.lessons || []) {
			const content = cached.get(`${course.courseKey}::${lesson.lessonKey}`);
			if (isPlaceholderLesson(content)) continue;
			const quiz = Array.isArray(content?.quiz) ? content.quiz : [];
			if (quiz.length) {
				// Rotate through each lesson's bank so the exam is not always
				// the first (often easiest) question from every lesson.
				const pick = (courseIndex * 3 + lessonIndex) % quiz.length;
				const q = quiz[pick];
				const answerIndex = Number.isInteger(q?.answerIndex) ? q.answerIndex : -1;
				if (q?.question && Array.isArray(q.options) && q.options.length >= 2 && answerIndex >= 0 && answerIndex < q.options.length) {
					pool.push({
						id: `${course.courseKey}::${lesson.lessonKey}::${pick}`,
						question: String(q.question),
						options: q.options.map(String),
						answerIndex,
						courseTitle: course.title,
						lessonTitle: lesson.title,
					});
				}
			}
			lessonIndex += 1;
		}
		courseIndex += 1;
	}
	if (pool.length <= EXAM_MAX_QUESTIONS) return pool;
	// Evenly sample the full path rather than favouring the first courses.
	const step = pool.length / EXAM_MAX_QUESTIONS;
	return Array.from({ length: EXAM_MAX_QUESTIONS }, (_, i) => pool[Math.floor(i * step)]);
}

function publicExamQuestions(questions) {
	return questions.map(({ answerIndex, ...q }) => q);
}

async function loadExamContext(userId, pathKey) {
	const [enrollment, curriculumRow, progress, lessonRows] = await Promise.all([
		academyDb.getEnrollment(userId, pathKey),
		academyDb.getCurriculum(userId, pathKey),
		academyDb.listProgress(userId),
		academyDb.listLessons(userId, pathKey),
	]);
	if (!enrollment) return { error: { status: 404, message: 'Enroll in the path first.' } };
	const curriculum = curriculumRow?.curriculum;
	if (!curriculum) return { error: { status: 409, message: 'Your curriculum is still being prepared. Try again in a moment.' } };

	const lessons = (curriculum.courses || []).flatMap((course) =>
		(course.lessons || []).map((lesson) => ({ ...lesson, courseKey: course.courseKey, courseTitle: course.title })),
	);
	const completed = new Set(
		(progress || [])
			.filter((p) => p.pathKey === pathKey && p.completed && p.courseKey !== EXAM_COURSE)
			.map((p) => `${p.courseKey}:${p.lessonKey}`),
	);
	const remaining = lessons.filter((l) => !completed.has(`${l.courseKey}:${l.lessonKey}`)).length;
	if (remaining > 0) {
		return {
			error: {
				status: 422,
				code: 'exam_locked',
				message: `Finish the remaining ${remaining} lesson${remaining === 1 ? '' : 's'} before taking the certificate exam.`,
				remaining,
			},
		};
	}

	const questions = buildFinalExam(curriculum, lessonRows);
	if (!questions.length) {
		return {
			error: {
				status: 503,
				code: 'exam_not_ready',
				message: 'The exam questions are still being prepared. Open each lesson once, then try again.',
			},
		};
	}
	const examRow = (progress || []).find(
		(p) => p.pathKey === pathKey && p.courseKey === EXAM_COURSE && p.lessonKey === EXAM_LESSON,
	);
	return { curriculum, lessons, questions, examRow };
}

function examResult(examRow, totalQuestions) {
	const score = Number(examRow?.quizScore) || 0;
	const total = Number(examRow?.quizTotal) || totalQuestions;
	const percent = total ? Math.round((score / total) * 100) : 0;
	return { score, total, percent, passed: percent >= EXAM_PASS_PERCENT };
}

router.get('/exam', async (req, res) => {
	const { pathKey } = req.query;
	if (!pathKey) return res.status(422).json({ error: { message: 'pathKey is required' } });
	try {
		const ctx = await loadExamContext(req.userId, pathKey);
		if (ctx.error) {
			return res.status(ctx.error.status).json({ error: { message: ctx.error.message, code: ctx.error.code, remaining: ctx.error.remaining } });
		}
		const result = examResult(ctx.examRow, ctx.questions.length);
		res.json({
			status: result.passed ? 'passed' : 'ready',
			pathKey,
			questions: publicExamQuestions(ctx.questions),
			passMark: EXAM_PASS_PERCENT,
			...result,
		});
	} catch (err) {
		logger.error('academy exam load failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not prepare the certificate exam right now.' } });
	}
});

router.post('/exam/grade', async (req, res) => {
	const { pathKey, answers } = req.body ?? {};
	if (!pathKey) return res.status(422).json({ error: { message: 'pathKey is required' } });
	if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
		return res.status(422).json({ error: { message: 'answers is required' } });
	}
	try {
		const ctx = await loadExamContext(req.userId, pathKey);
		if (ctx.error) {
			return res.status(ctx.error.status).json({ error: { message: ctx.error.message, code: ctx.error.code, remaining: ctx.error.remaining } });
		}
		const unanswered = ctx.questions.filter((q) => {
			const answer = answers[q.id];
			return answer === undefined || answer === null || answer === '';
		});
		if (unanswered.length) {
			return res.status(422).json({ error: { message: `Answer all ${ctx.questions.length} questions before submitting.`, code: 'exam_incomplete', remaining: unanswered.length } });
		}

		const missed = [];
		let score = 0;
		for (const q of ctx.questions) {
			if (Number(answers[q.id]) === q.answerIndex) score += 1;
			else missed.push(q.courseTitle);
		}
		const total = ctx.questions.length;
		const percent = Math.round((score / total) * 100);
		const passed = percent >= EXAM_PASS_PERCENT;
		const prior = examResult(ctx.examRow, total);
		const uniqueMissed = [...new Set(missed)];
		if (prior.passed && !passed) {
			return res.json({
				status: 'passed',
				score: prior.score,
				total: prior.total,
				percent: prior.percent,
				passed: true,
				passMark: EXAM_PASS_PERCENT,
				feedback: 'You have already passed this exam, so your certificate stays earned. Review the missed topics whenever you like.',
				missedCourses: uniqueMissed,
			});
		}
		const feedback = passed
			? `Passed with ${score}/${total} (${percent}%). You are ready to claim your certificate.`
			: `You scored ${score}/${total} (${percent}%). You need ${EXAM_PASS_PERCENT}% to pass. Review ${uniqueMissed.slice(0, 4).join(', ')}${uniqueMissed.length > 4 ? ' and the other missed sections' : ''}, then retake the exam.`;

		await academyDb.upsertProgress(req.userId, {
			pathKey,
			courseKey: EXAM_COURSE,
			lessonKey: EXAM_LESSON,
			completed: true,
			completedAt: new Date().toISOString(),
			quizScore: score,
			quizTotal: total,
			quizFeedback: feedback,
		});
		res.json({ status: passed ? 'passed' : 'failed', score, total, percent, passed, passMark: EXAM_PASS_PERCENT, feedback, missedCourses: uniqueMissed });
	} catch (err) {
		logger.error('academy exam grade failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not grade the certificate exam right now.' } });
	}
});

// ── Enroll in a learning path (starts SI curriculum generation) ─────
router.post('/enroll', academyAiRateLimit, async (req, res) => {
	const { pathKey } = req.body ?? {};
	if (!pathKey) return res.status(422).json({ error: { message: 'pathKey is required' } });

	try {
		await academyDb.createEnrollment(req.userId, pathKey);
		res.json({ status: 'enrolled', pathKey });
	} catch (err) {
		logger.error('academy enroll failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not enroll in this path.' } });
	}
});

// ── Curriculum: generate once in background, client polls while generating
const generating = new Set();
const curriculumKey = (userId, pathKey) => `${userId}:${pathKey}`;

async function ensureCurriculum(userId, pathKey, level, about) {
	const cached = await academyDb.getCurriculum(userId, pathKey);
	if (cached) return { status: 'ready', curriculum: cached.curriculum };
	const key = curriculumKey(userId, pathKey);
	if (!generating.has(key)) {
		generating.add(key);
		generateCurriculum({ userId, level, about, pathKey })
			.then((curriculum) => academyDb.saveCurriculum(userId, pathKey, curriculum))
			.catch((err) => logger.error('academy curriculum background failed', String(err?.message || err)))
			.finally(() => generating.delete(key));
	}
	return { status: 'generating' };
}

router.get('/curriculum', async (req, res) => {
	const { pathKey, level, about } = req.query;
	if (!pathKey) return res.status(422).json({ error: { message: 'pathKey is required' } });
	try {
		const result = await ensureCurriculum(req.userId, pathKey, level, about);
		res.json(result);
	} catch (err) {
		logger.error('academy curriculum failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'The SI could not build your curriculum right now. Please try again.' } });
	}
});

// ── Lesson content (SI-generated, cached) ───────────────────────────
router.post('/lesson', academyAiRateLimit, async (req, res) => {
	const { pathKey, courseKey, lessonKey } = req.body ?? {};
	if (!pathKey || !courseKey || !lessonKey) {
		return res.status(422).json({ error: { message: 'pathKey, courseKey and lessonKey are required' } });
	}
	try {
		const cached = await academyDb.getLesson(req.userId, pathKey, courseKey, lessonKey);
		if (cached && !isPlaceholderLesson(cached.content)) {
			queueLessonQuiz({ userId: req.userId, pathKey, courseKey, lessonKey, content: cached.content });
			return res.json({ status: 'ready', content: lessonForStudent(cached.content) });
		}

		const curriculumRow = await academyDb.getCurriculum(req.userId, pathKey);
		const curriculum = curriculumRow?.curriculum;
		const course = curriculum?.courses?.find((c) => c.courseKey === courseKey);
		const lesson = course?.lessons?.find((l) => l.lessonKey === lessonKey);
		if (!curriculum || !course || !lesson) {
			return res.status(404).json({ error: { message: 'Lesson not found in your curriculum.' } });
		}

		const content = await generateAndCacheLesson({
			userId: req.userId,
			pathKey,
			courseKey,
			lessonKey,
			curriculum,
			course,
			lesson,
		});
		res.json({ status: 'ready', content: lessonForStudent(content) });
	} catch (err) {
		logger.error('academy lesson failed', String(err?.message || err));
		if (err?.status === 503) {
			return res.status(503).json({
				error: {
					message: err.message || 'The SI could not write this lesson yet. Please try again in a moment.',
					code: err.code || 'lesson_generation_failed',
				},
			});
		}
		res.status(500).json({ error: { message: 'The SI could not write this lesson right now. Please try again.' } });
	}
});

// ── Lesson translation for read-aloud ───────────────────────────────
// The lesson is generated in English once. When a student asks to hear it in
// another language, translate the cached lesson and store the translation
// inside the same content row so replay is instant.
const translationGenerating = new Map();

router.post('/lesson/translate', academyAiRateLimit, async (req, res) => {
	const { pathKey, courseKey, lessonKey, lang } = req.body ?? {};
	if (!pathKey || !courseKey || !lessonKey) {
		return res.status(422).json({ error: { message: 'pathKey, courseKey and lessonKey are required' } });
	}
	if (!isLessonTranslationLang(lang)) {
		return res.status(422).json({ error: { message: 'That audio language is not supported.' } });
	}
	try {
		const row = await academyDb.getLesson(req.userId, pathKey, courseKey, lessonKey);
		if (!row?.content || isPlaceholderLesson(row.content)) {
			return res.status(404).json({ error: { message: 'Open the lesson before preparing translated audio.' } });
		}
		const cached = row.content.translations?.[lang];
		if (cached) return res.json({ status: 'ready', lang, content: cached, cached: true });

		const key = `${req.userId}:${pathKey}:${courseKey}:${lessonKey}:${lang}`;
		let promise = translationGenerating.get(key);
		if (!promise) {
			promise = translateLessonContent({ content: row.content, lang })
				.then(async (translated) => {
					const latest = await academyDb.getLesson(req.userId, pathKey, courseKey, lessonKey);
					const latestContent = latest?.content && !isPlaceholderLesson(latest.content)
						? latest.content
						: row.content;
					await academyDb.saveLesson(req.userId, pathKey, courseKey, lessonKey, {
						...latestContent,
						translations: {
							...(latestContent.translations || {}),
							[lang]: translated,
						},
					});
					return translated;
				})
				.finally(() => translationGenerating.delete(key));
			translationGenerating.set(key, promise);
		}
		const translated = await promise;
		res.json({ status: 'ready', lang, content: translated });
	} catch (err) {
		logger.error('academy lesson translation failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'The SI could not prepare translated audio right now. Please try again.' } });
	}
});

// ── SI-graded quiz ──────────────────────────────────────────────────
router.post('/quiz/grade', academyAiRateLimit, async (req, res) => {
	const { pathKey, courseKey, lessonKey, answers } = req.body ?? {};
	if (!pathKey || !courseKey || !lessonKey) {
		return res.status(422).json({ error: { message: 'pathKey, courseKey and lessonKey are required' } });
	}
	try {
		const row = await academyDb.getLesson(req.userId, pathKey, courseKey, lessonKey);
		if (!row) return res.status(404).json({ error: { message: 'Lesson not found.' } });

		const result = await gradeQuiz({ lesson: row.content, answers });
		const total = row.content.quiz.length;
		await academyDb.upsertProgress(req.userId, {
			pathKey,
			courseKey,
			lessonKey,
			quizScore: result.score,
			quizTotal: total,
			quizFeedback: result.feedback,
		});
		res.json({ status: 'ready', score: result.score, total, feedback: result.feedback });
	} catch (err) {
		logger.error('academy quiz grade failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'The SI grader could not grade your quiz right now. Please try again.' } });
	}
});

// ── Mark a lesson complete ──────────────────────────────────────────
router.post('/complete', async (req, res) => {
	const { pathKey, courseKey, lessonKey } = req.body ?? {};
	if (!pathKey || !courseKey || !lessonKey) {
		return res.status(422).json({ error: { message: 'pathKey, courseKey and lessonKey are required' } });
	}
	try {
		await academyDb.upsertProgress(req.userId, {
			pathKey,
			courseKey,
			lessonKey,
			completed: true,
			completedAt: new Date().toISOString(),
		});
		res.json({ status: 'completed', pathKey, courseKey, lessonKey });
	} catch (err) {
		logger.error('academy complete failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not save progress.' } });
	}
});

// ── Dashboard payload ───────────────────────────────────────────────
router.get('/progress', async (req, res) => {
	try {
		const [progress, enrollments, curricula, rsvps] = await Promise.all([
			academyDb.listProgress(req.userId),
			academyDb.listEnrollments(req.userId),
			academyDb.listCurricula(req.userId),
			academyDb.listRsvps(req.userId),
		]);
		res.json({
			progress: progress || [],
			enrollments: enrollments || [],
			curricula: (curricula || []).map((c) => ({ pathKey: c.pathKey, curriculum: c.curriculum })),
			rsvps: (rsvps || []).map((r) => r.webinarId),
			attended: (rsvps || []).filter((r) => r.attendedAt).map((r) => r.webinarId),
		});
	} catch (err) {
		logger.error('academy progress failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not load your Academy progress.' } });
	}
});

// ── Certificate (path 100% complete) ────────────────────────────────
router.post('/certificate', academyAiRateLimit, async (req, res) => {
	const { pathKey } = req.body ?? {};
	if (!pathKey) return res.status(422).json({ error: { message: 'pathKey is required' } });

	try {
		const enrollment = await academyDb.getEnrollment(req.userId, pathKey);
		if (!enrollment) return res.status(404).json({ error: { message: 'Enroll in the path first.' } });

		if (enrollment.certificateCode) {
			return res.json({
				status: 'ready',
				code: enrollment.certificateCode,
				certificateText: enrollment.certificateText,
				generatedAt: enrollment.certificateGeneratedAt,
			});
		}

		const curriculumRow = await academyDb.getCurriculum(req.userId, pathKey);
		const curriculum = curriculumRow?.curriculum;
		const lessons = (curriculum?.courses || []).flatMap((course) =>
			(course.lessons || []).map((lesson) => ({ ...lesson, courseKey: course.courseKey })),
		);
		const progress = await academyDb.listProgress(req.userId);
		const completedLessons = new Set(
			(progress || [])
				.filter((p) => p.pathKey === pathKey && p.completed && p.courseKey !== EXAM_COURSE)
				.map((p) => `${p.courseKey}:${p.lessonKey}`),
		);
		const allLessonsDone = lessons.length > 0 && lessons.every((l) => completedLessons.has(`${l.courseKey}:${l.lessonKey}`));
		if (!allLessonsDone) {
			return res.status(422).json({ error: { message: 'Complete every lesson before claiming your certificate.' } });
		}

		const examRow = (progress || []).find(
			(p) => p.pathKey === pathKey && p.courseKey === EXAM_COURSE && p.lessonKey === EXAM_LESSON,
		);
		const examScore = Number(examRow?.quizScore) || 0;
		const examTotal = Number(examRow?.quizTotal) || 0;
		const examPercent = examTotal ? Math.round((examScore / examTotal) * 100) : 0;
		if (!examRow || examPercent < EXAM_PASS_PERCENT) {
			return res.status(422).json({
				error: {
					message: `Pass the final certificate exam with at least ${EXAM_PASS_PERCENT}% before claiming your certificate.`,
					code: 'exam_required',
				},
			});
		}

		const totalMins = lessons.reduce((acc, l) => acc + (Number(l.minutes) || 0), 0);
		const stats = `${lessons.length} lessons, ${totalMins} minutes, final exam ${examScore}/${examTotal} (${examPercent}%)`;

		const certificateText = await generateCertificate({ pathName: curriculum.pathName, stats });
		const code = `TB-AC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

		await academyDb.updateEnrollment(req.userId, pathKey, {
			certificateCode: code,
			certificateText,
			certificateGeneratedAt: new Date().toISOString(),
		});
		res.json({ status: 'ready', code, certificateText, generatedAt: new Date().toISOString() });
	} catch (err) {
		logger.error('academy certificate failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not generate your certificate right now.' } });
	}
});

// ── Webinar RSVPs ───────────────────────────────────────────────────
router.post('/webinar/rsvp', async (req, res) => {
	const { webinarId } = req.body ?? {};
	if (!webinarId) return res.status(422).json({ error: { message: 'webinarId is required' } });
	try {
		await academyDb.upsertRsvp(req.userId, String(webinarId).slice(0, 120));
		res.json({ status: 'rsvped', webinarId });
	} catch (err) {
		logger.error('academy rsvp failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not save your RSVP.' } });
	}
});

router.delete('/webinar/rsvp', async (req, res) => {
	const { webinarId } = req.query ?? {};
	if (!webinarId) return res.status(422).json({ error: { message: 'webinarId is required' } });
	try {
		await academyDb.deleteRsvp(req.userId, String(webinarId).slice(0, 120));
		res.json({ status: 'removed', webinarId });
	} catch (err) {
		logger.error('academy rsvp delete failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not remove your RSVP.' } });
	}
});

// ── Webinar attendance — mark when the member enters the live SI room
router.post('/webinar/attend', async (req, res) => {
	const { webinarId } = req.body ?? {};
	if (!webinarId) return res.status(422).json({ error: { message: 'webinarId is required' } });
	try {
		await academyDb.markAttended(req.userId, String(webinarId).slice(0, 120));
		res.json({ status: 'attended', webinarId });
	} catch (err) {
		logger.error('academy attend failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not record attendance.' } });
	}
});

// ── SI Tutor (SSE, lesson-context) ──────────────────────────────────
router.post('/tutor/stream', academyAiRateLimit, async (req, res) => {
	const { pathKey, courseKey, lessonKey, history, question } = req.body ?? {};
	if (!pathKey || !courseKey || !lessonKey || typeof question !== 'string' || !question.trim()) {
		return res.status(422).json({ error: { message: 'Lesson context and a question are required.' } });
	}
	try {
		const row = await academyDb.getLesson(req.userId, pathKey, courseKey, lessonKey);
		if (!row) return res.status(404).json({ error: { message: 'Open the lesson first.' } });

		const sse = openSse(res);
		let source;
		try {
			source = await withTimeout(
				tutorStream({
					userId: req.userId,
					lesson: row.content,
					progressNote: 'The student is working through this lesson right now.',
					history,
					question,
				}),
				siSetupTimeoutMs(),
				'SI tutor',
			);
		} catch (err) {
			logger.error('academy tutor failed', String(err?.message || err));
			sse.event({ type: 'error', data: { content: 'The SI tutor is unavailable right now. Please try again.' } });
			sse.event({ type: 'completed', data: { content: '[COMPLETED]' } });
			sse.cleanup();
			endSse(res);
			return;
		}

		const narration = stripStreamNarration();
		const fail = (err) => {
			logger.error('academy tutor stream failed', String(err?.message || err));
			sse.event({ type: 'error', data: { content: 'The SI tutor stopped unexpectedly. Please try again.' } });
			sse.cleanup();
			endSse(res);
		};
		source.on('error', fail);
		narration.on('error', fail);
		source.pipe(narration).pipe(res, { end: false });
		narration.on('end', () => {
			sse.cleanup();
			endSse(res);
		});
		res.on('close', () => {
			sse.cleanup();
			source.destroy();
			narration.destroy();
		});
	} catch (err) {
		logger.error('academy tutor failed', String(err?.message || err));
		if (!res.headersSent) {
			res.status(500).json({ error: { message: 'The SI tutor is unavailable right now. Please try again.' } });
		} else {
			endSse(res);
		}
	}
});

// ── Live Webinar SI host (SSE) ──────────────────────────────────────
router.post('/webinar/stream', academyAiRateLimit, async (req, res) => {
	const { webinar, scheduleNote, history, question } = req.body ?? {};
	if (!webinar?.title) return res.status(422).json({ error: { message: 'Webinar details are required.' } });
	const sse = openSse(res);
	let source;
	try {
		source = await withTimeout(
			webinarStream({
				userId: req.userId,
				webinar,
				scheduleNote: scheduleNote || '',
				history,
				question,
			}),
			siSetupTimeoutMs(),
			'SI webinar host',
		);
	} catch (err) {
		logger.error('academy webinar failed', String(err?.message || err));
		sse.event({ type: 'error', data: { content: 'The live SI host is unavailable right now. Please try again.' } });
		sse.event({ type: 'completed', data: { content: '[COMPLETED]' } });
		sse.cleanup();
		endSse(res);
		return;
	}

	const narration = stripStreamNarration();
	const fail = (err) => {
		logger.error('academy webinar stream failed', String(err?.message || err));
		sse.event({ type: 'error', data: { content: 'The live SI host stopped unexpectedly. Please try again.' } });
		sse.cleanup();
		endSse(res);
	};
	source.on('error', fail);
	narration.on('error', fail);
	source.pipe(narration).pipe(res, { end: false });
	narration.on('end', () => {
		sse.cleanup();
		endSse(res);
	});
	res.on('close', () => {
		sse.cleanup();
		source.destroy();
		narration.destroy();
	});
});

export default router;
