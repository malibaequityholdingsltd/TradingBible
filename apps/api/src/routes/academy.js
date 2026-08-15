import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import {
	academyDb,
	generateCertificate,
	generateCurriculum,
	generateLessonContent,
	gradeQuiz,
	tutorStream,
	webinarStream,
} from '../api/academy.js';

const router = Router();

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
		if (!user?.academyAccess) {
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
		res.json({ access: Boolean(user?.academyAccess), purchasedAt: user?.academyPurchasedAt || null });
	} catch (err) {
		logger.error('academy access failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'Could not check Academy access.' } });
	}
});

// Everything below requires a purchased Academy membership.
router.use(requireAccess);

// ── Enroll in a learning path (starts AI curriculum generation) ─────
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

// ── Curriculum: generate once, then cache (poll while generating) ───
const generating = new Set();
const curriculumKey = (userId, pathKey) => `${userId}:${pathKey}`;

async function ensureCurriculum(userId, pathKey, level, about) {
	const cached = await academyDb.getCurriculum(userId, pathKey);
	if (cached) return { status: 'ready', curriculum: cached.curriculum };
	const key = curriculumKey(userId, pathKey);
	if (generating.has(key)) return { status: 'generating' };
	generating.add(key);
	try {
		const curriculum = await generateCurriculum({ userId, level, about });
		await academyDb.saveCurriculum(userId, pathKey, curriculum);
		return { status: 'ready', curriculum };
	} finally {
		generating.delete(key);
	}
}

router.get('/curriculum', async (req, res) => {
	const { pathKey, level, about } = req.query;
	if (!pathKey) return res.status(422).json({ error: { message: 'pathKey is required' } });
	try {
		const result = await ensureCurriculum(req.userId, pathKey, level, about);
		res.json(result);
	} catch (err) {
		logger.error('academy curriculum failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'The AI could not build your curriculum right now. Please try again.' } });
	}
});

// ── Lesson content (AI-generated, cached) ───────────────────────────
router.post('/lesson', academyAiRateLimit, async (req, res) => {
	const { pathKey, courseKey, lessonKey } = req.body ?? {};
	if (!pathKey || !courseKey || !lessonKey) {
		return res.status(422).json({ error: { message: 'pathKey, courseKey and lessonKey are required' } });
	}
	try {
		const cached = await academyDb.getLesson(req.userId, pathKey, courseKey, lessonKey);
		if (cached) return res.json({ status: 'ready', content: cached.content });

		const curriculumRow = await academyDb.getCurriculum(req.userId, pathKey);
		const curriculum = curriculumRow?.curriculum;
		const course = curriculum?.courses?.find((c) => c.courseKey === courseKey);
		const lesson = course?.lessons?.find((l) => l.lessonKey === lessonKey);
		if (!curriculum || !course || !lesson) {
			return res.status(404).json({ error: { message: 'Lesson not found in your curriculum.' } });
		}

		const content = await generateLessonContent({ curriculum, course, lesson });
		await academyDb.saveLesson(req.userId, pathKey, courseKey, lessonKey, content);
		res.json({ status: 'ready', content });
	} catch (err) {
		logger.error('academy lesson failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'The AI could not write this lesson right now. Please try again.' } });
	}
});

// ── AI-graded quiz ──────────────────────────────────────────────────
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
		res.status(500).json({ error: { message: 'The AI grader could not grade your quiz right now. Please try again.' } });
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
		const lessons = (curriculum?.courses || []).flatMap((c) => c.lessons || []);
		const progress = await academyDb.listProgress(req.userId);
		const pathProgress = (progress || []).filter((p) => p.pathKey === pathKey && p.completed);
		if (pathProgress.length < lessons.length) {
			return res.status(422).json({ error: { message: 'Complete every lesson before claiming your certificate.' } });
		}

		const totalMins = lessons.reduce((acc, l) => acc + (Number(l.minutes) || 0), 0);
		const quizScore = pathProgress.reduce((acc, p) => acc + (Number(p.quizScore) || 0), 0);
		const quizTotal = pathProgress.reduce((acc, p) => acc + (Number(p.quizTotal) || 0), 0);
		const stats = `${lessons.length} lessons, ${totalMins} minutes, quiz average ${quizTotal ? Math.round((quizScore / quizTotal) * 100) : 0}%`;

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

// ── AI Tutor (SSE, lesson-context) ──────────────────────────────────
router.post('/tutor/stream', academyAiRateLimit, async (req, res) => {
	const { pathKey, courseKey, lessonKey, history, question } = req.body ?? {};
	if (!pathKey || !courseKey || !lessonKey || typeof question !== 'string' || !question.trim()) {
		return res.status(422).json({ error: { message: 'Lesson context and a question are required.' } });
	}
	try {
		const row = await academyDb.getLesson(req.userId, pathKey, courseKey, lessonKey);
		if (!row) return res.status(404).json({ error: { message: 'Open the lesson first.' } });
		const sse = tutorStream({
			userId: req.userId,
			lesson: row.content,
			progressNote: 'The student is working through this lesson right now.',
			history,
			question,
		});
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		sse.pipe(res, { end: false });
		res.on('close', () => sse.destroy());
	} catch (err) {
		logger.error('academy tutor failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'The AI tutor is unavailable right now. Please try again.' } });
	}
});

// ── Live Webinar AI host (SSE) ──────────────────────────────────────
router.post('/webinar/stream', academyAiRateLimit, async (req, res) => {
	const { webinar, scheduleNote, history, question } = req.body ?? {};
	if (!webinar?.title) return res.status(422).json({ error: { message: 'Webinar details are required.' } });
	try {
		const sse = webinarStream({
			userId: req.userId,
			webinar,
			scheduleNote: scheduleNote || '',
			history,
			question,
		});
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		sse.pipe(res, { end: false });
		res.on('close', () => sse.destroy());
	} catch (err) {
		logger.error('academy webinar failed', String(err?.message || err));
		res.status(500).json({ error: { message: 'The live AI host is unavailable right now. Please try again.' } });
	}
});

export default router;
