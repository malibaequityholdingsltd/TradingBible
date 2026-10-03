import { Router } from 'express';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';

const router = Router();

async function assertTeacher(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	const authUser = await getSupabaseUser(token);
	if (!authUser?.id) {
		const err = new Error('unauthorized');
		err.status = 401;
		throw err;
	}
	const profile = await supabase.getUserById(authUser.id).catch(() => null);
	const accountType = profile?.accountType || authUser.user_metadata?.accountType || 'trader';
	if (accountType !== 'teacher' && profile?.role !== 'admin') {
		const err = new Error('teacher account required');
		err.status = 403;
		throw err;
	}
	return { authUser, profile };
}

// ── GET /company/teacher/overview — TradingBible Academy at a glance
// for Teacher accounts: enrollments by path, completions, certificates,
// webinar engagement, plus the teacher's own job application status.
router.get('/teacher/overview', supabaseAuth, async (req, res, next) => {
	try {
		const { authUser, profile } = await assertTeacher(req);
		const [enrollments, progress, rsvps, applications] = await Promise.all([
			supabaseRest('/rest/v1/academy_enrollments', {
				query: { select: 'pathKey,certificateCode', limit: 5000 },
			}).catch(() => []),
			supabaseRest('/rest/v1/academy_progress', {
				query: { select: 'completed', completed: 'eq.true', limit: 5000 },
			}).catch(() => []),
			supabaseRest('/rest/v1/academy_webinar_rsvps', {
				query: { select: 'attendedAt', limit: 5000 },
			}).catch(() => []),
			supabaseRest('/rest/v1/job_applications', {
				query: { select: 'id,status,created,job_postings(title)', email: `eq.${encodeURIComponent(String(authUser.email || '').toLowerCase())}`, order: 'created.desc', limit: 20 },
			}).catch(() => []),
		]);
		const byPath = {};
		let certificates = 0;
		for (const e of enrollments || []) {
			byPath[e.pathKey] = (byPath[e.pathKey] || 0) + 1;
			if (e.certificateCode) certificates++;
		}
		res.json({
			teacher: {
				name: profile?.username || authUser.email?.split('@')[0],
				email: authUser.email,
				subject: profile?.teacherSubject || authUser.user_metadata?.teacherSubject || null,
				bio: profile?.teacherBio || authUser.user_metadata?.teacherBio || null,
			},
			academy: {
				enrollments: (enrollments || []).length,
				byPath,
				lessonsCompleted: (progress || []).length,
				certificates,
				webinarRsvps: (rsvps || []).length,
				webinarAttended: (rsvps || []).filter((r) => r.attendedAt).length,
			},
			myApplications: (applications || []).map((a) => ({
				id: a.id,
				job: a.job_postings?.title || 'Opening',
				status: a.status,
				created: a.created,
			})),
		});
	} catch (err) { next(err); }
});

export default router;
