import { Router } from 'express';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';

const router = Router();

async function assertCompany(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	const authUser = await getSupabaseUser(token);
	if (!authUser?.id) {
		const err = new Error('unauthorized');
		err.status = 401;
		throw err;
	}
	const profile = await supabase.getUserById(authUser.id).catch(() => null);
	const accountType = profile?.accountType || authUser.user_metadata?.accountType || 'individual';
	if (accountType !== 'company' && profile?.role !== 'admin') {
		const err = new Error('company account required');
		err.status = 403;
		throw err;
	}
	return authUser;
}

// ── Teacher helpers ──────────────────────────────────────────────
// A teacher is anyone whose auth email matches a school_teachers row.
// They act within the owning school's scope via the service role
// (RLS would never allow cross-user rows client-side).
async function findTeacherRow(email) {
	const rows = await supabaseRest('/rest/v1/school_teachers', {
		query: { select: 'id,owner,name,email,subject', email: `eq.${encodeURIComponent(String(email).toLowerCase())}`, limit: 5 },
	});
	const exact = (rows || []).find((r) => String(r.email || '').toLowerCase() === String(email).toLowerCase());
	return exact || null;
}

async function schoolScope(ownerId) {
	const q = (table, order) => supabaseRest(`/rest/v1/${table}`, {
		query: { select: '*', owner: `eq.${ownerId}`, order: `${order}.desc`, limit: 2000 },
	});
	const [students, teachers, assessments, submissions, classrooms] = await Promise.all([
		q('school_students', 'created'),
		q('school_teachers', 'created'),
		q('school_assessments', 'created'),
		supabaseRest('/rest/v1/school_submissions', {
			query: { select: '*', owner: `eq.${ownerId}`, order: 'submittedAt.desc', limit: 2000 },
		}),
		q('school_classrooms', 'created'),
	]);
	const ownerProfile = await supabase.getUserById(ownerId).catch(() => null);
	return {
		schoolName: ownerProfile?.companyName || ownerProfile?.username || 'School',
		students: students || [],
		teachers: (teachers || []).map((x) => ({ id: x.id, name: x.name, email: x.email, subject: x.subject })),
		assessments: assessments || [],
		submissions: submissions || [],
		classrooms: classrooms || [],
	};
}

async function assertTeacher(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	const authUser = await getSupabaseUser(token);
	if (!authUser?.id || !authUser.email) {
		const err = new Error('unauthorized');
		err.status = 401;
		throw err;
	}
	const row = await findTeacherRow(authUser.email);
	if (!row) {
		const err = new Error('teacher account required — ask your school to invite this email, then open /teacher');
		err.status = 403;
		throw err;
	}
	return { authUser, teacher: row };
}

// ── GET /company/teacher-scope — the teacher's school workspace ──
router.get('/teacher-scope', supabaseAuth, async (req, res, next) => {
	try {
		const { teacher } = await assertTeacher(req);
		const scope = await schoolScope(teacher.owner);
		res.json({ teacher: { name: teacher.name, email: teacher.email, subject: teacher.subject }, ...scope });
	} catch (err) { next(err); }
});

// ── POST /company/submissions/:id/grade — teacher grading ────────
router.post('/submissions/:id/grade', supabaseAuth, async (req, res, next) => {
	try {
		const { teacher } = await assertTeacher(req);
		const rows = await supabaseRest(`/rest/v1/school_submissions?id=eq.${encodeURIComponent(req.params.id)}`, {
			query: { select: '*', limit: 1 },
		});
		const sub = rows?.[0];
		if (!sub) return res.status(404).json({ error: 'submission not found' });
		if (String(sub.owner) !== String(teacher.owner)) return res.status(403).json({ error: 'not your school' });
		const score = req.body?.score === '' || req.body?.score == null ? null : Number(req.body.score);
		if (score !== null && !Number.isFinite(score)) return res.status(400).json({ error: 'score must be a number' });
		const updated = await supabaseRest(`/rest/v1/school_submissions?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH',
			body: {
				status: 'graded',
				score,
				feedback: String(req.body?.feedback || '').slice(0, 2000) || null,
			},
			prefer: 'return=representation', query: { select: '*' },
		});
		res.json(updated?.[0] || { id: req.params.id, status: 'graded' });
	} catch (err) { next(err); }
});

// ── GET /company/teachers/status — which invited teachers have logins
router.get('/teachers/status', supabaseAuth, async (req, res, next) => {
	try {
		const me = await assertCompany(req);
		const mine = await supabaseRest('/rest/v1/school_teachers', {
			query: { select: 'email', owner: `eq.${me.id}`, limit: 500 },
		});
		const emails = [...new Set((mine || []).map((r) => String(r.email || '').toLowerCase()).filter(Boolean))];
		const found = new Set();
		await Promise.all(emails.map(async (email) => {
			try {
				const rows = await supabaseRest('/rest/v1/users', { query: { select: 'id', email: `eq.${encodeURIComponent(email)}`, limit: 1 } });
				if (rows?.length) found.add(email);
			} catch { /* ignore */ }
		}));
		res.json({ status: emails.map((email) => ({ email, hasLogin: found.has(email) })) });
	} catch (err) { next(err); }
});

// ── Student helpers ──────────────────────────────────────────────
// A student is anyone whose auth email matches a school_students row.
// Same service-role scoping pattern as teachers.
async function findStudentRow(email) {
	const rows = await supabaseRest('/rest/v1/school_students', {
		query: { select: 'id,owner,name,email,classroom', email: `eq.${encodeURIComponent(String(email).toLowerCase())}`, limit: 5 },
	});
	const exact = (rows || []).find((r) => String(r.email || '').toLowerCase() === String(email).toLowerCase());
	return exact || null;
}

async function assertStudent(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	const authUser = await getSupabaseUser(token);
	if (!authUser?.id || !authUser.email) {
		const err = new Error('unauthorized');
		err.status = 401;
		throw err;
	}
	const row = await findStudentRow(authUser.email);
	if (!row) {
		const err = new Error('student account required — ask your school to enroll this email, then open /student');
		err.status = 403;
		throw err;
	}
	return { authUser, student: row };
}

// ── GET /company/student-scope — exams, my work, my certificates ──
router.get('/student-scope', supabaseAuth, async (req, res, next) => {
	try {
		const { student } = await assertStudent(req);
		const owner = student.owner;
		const [assessments, submissions, certs] = await Promise.all([
			supabaseRest('/rest/v1/school_assessments', {
				query: { select: 'id,title,type,status,payload', owner: `eq.${owner}`, status: 'eq.published', order: 'created.desc', limit: 500 },
			}),
			supabaseRest('/rest/v1/school_submissions', {
				query: { select: 'id,assessmentId,assessmentTitle,type,content,status,score,feedback,submittedAt', owner: `eq.${owner}`, studentId: `eq.${student.id}`, order: 'submittedAt.desc', limit: 500 },
			}),
			supabaseRest('/rest/v1/school_certificates', {
				query: { select: 'id,title,studentName,issuedAt', owner: `eq.${owner}`, studentName: `eq.${encodeURIComponent(student.name)}`, order: 'issuedAt.desc', limit: 200 },
			}),
		]);
		const ownerProfile = await supabase.getUserById(owner).catch(() => null);
		res.json({
			student: { name: student.name, email: student.email, classroom: student.classroom },
			schoolName: ownerProfile?.companyName || ownerProfile?.username || 'School',
			assessments: assessments || [],
			submissions: submissions || [],
			certificates: certs || [],
		});
	} catch (err) { next(err); }
});

// ── POST /company/student/submissions — student answers an exam ───
router.post('/student/submissions', supabaseAuth, async (req, res, next) => {
	try {
		const { student } = await assertStudent(req);
		const assessmentId = String(req.body?.assessmentId || '').trim();
		const content = String(req.body?.content || '').trim().slice(0, 20000);
		if (!assessmentId || !content) return res.status(400).json({ error: 'assessmentId and content required' });
		const aRows = await supabaseRest(`/rest/v1/school_assessments?id=eq.${encodeURIComponent(assessmentId)}`, {
			query: { select: 'id,title,type,status,owner', limit: 1 },
		});
		const exam = aRows?.[0];
		if (!exam || String(exam.owner) !== String(student.owner)) return res.status(404).json({ error: 'exam not found' });
		if (exam.status !== 'published') return res.status(409).json({ error: 'exam is not open' });
		const created = await supabaseRest('/rest/v1/school_submissions', {
			method: 'POST',
			body: {
				owner: student.owner,
				studentId: student.id,
				assessmentId: exam.id,
				studentName: student.name,
				assessmentTitle: exam.title,
				type: exam.type || 'quiz',
				content,
				status: 'submitted',
				submittedAt: new Date().toISOString(),
			},
			prefer: 'return=representation', query: { select: '*' },
		});
		res.status(201).json(created?.[0] || { status: 'submitted' });
	} catch (err) { next(err); }
});

// ── GET /company/academy-interest — platform users showing academy ──
// interest (service-role; RLS will never allow it client-side). Minimal
// public fields only: username + goal.
router.get('/academy-interest', supabaseAuth, async (req, res, next) => {
	try {
		await assertCompany(req);
		const rows = await supabaseRest('/rest/v1/users', {
			query: {
				select: 'username,goal',
				or: '(goal.ilike.*academy*,goal.ilike.*discipline*,goal.ilike.*learning*)',
				order: 'created_at.desc',
				limit: 200,
			},
		});
		res.json((rows || []).map((r) => ({
			username: r.username || 'user',
			goal: r.goal || null,
		})));
	} catch (err) { next(err); }
});

export default router;
