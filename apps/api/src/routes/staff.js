import { Router } from 'express';
import { supabaseRest } from '../utils/supabaseClient.js';
import { deriveEmployeeNo } from '../utils/employeeNo.js';

// ── Public staff bios (scanned from printed ID card QR codes) ─────────
// No auth: anyone who scans a physical card opens the public profile.
// Only company-safe fields are exposed — personal email and phone never
// leave the admin portal.
const router = Router();

router.get('/:id', async (req, res, next) => {
	try {
		const id = String(req.params.id || '').trim();
		if (!id) return res.status(400).json({ error: 'id required' });

		// Primary key: job application id (that's what payroll returns and
		// what the QR code encodes).
		let app = (await supabaseRest('/rest/v1/job_applications', {
			query: { select: 'id,name,email,status,created,jobId', id: `eq.${id}`, limit: 1 },
		}).catch(() => []))?.[0] || null;

		// Fallback: a user id was scanned → resolve their hired application
		// through the profile email.
		if (!app) {
			const user = (await supabaseRest('/rest/v1/users', {
				query: { select: 'id,email,name', id: `eq.${id}`, limit: 1 },
			}).catch(() => []))?.[0] || null;
			if (user?.email) {
				app = (await supabaseRest('/rest/v1/job_applications', {
					query: { select: 'id,name,email,status,created,jobId', email: `eq.${user.email}`, status: 'eq.hired', order: 'created.asc', limit: 1 },
				}).catch(() => []))?.[0] || null;
			}
		}
		if (!app || app.status !== 'hired') return res.status(404).json({ error: 'staff profile not found' });

		// Title + department come from the posting; card extras (photo,
		// company email, bio, skills...) live on users.user_settings.staff
		// and are edited from Admin → Employees → ID Cards.
		let posting = null;
		if (app.jobId) {
			posting = (await supabaseRest('/rest/v1/job_postings', {
				query: { select: 'title,department', id: `eq.${app.jobId}`, limit: 1 },
			}).catch(() => []))?.[0] || null;
		}
		const profile = (await supabaseRest('/rest/v1/users', {
			query: { select: 'user_settings', email: `eq.${app.email}`, limit: 1 },
		}).catch(() => []))?.[0] || null;
		const s = profile?.user_settings && typeof profile.user_settings === 'object'
			&& profile.user_settings.staff && typeof profile.user_settings.staff === 'object'
			? profile.user_settings.staff
			: {};

		res.set('Cache-Control', 'public, max-age=120');
		res.json({
			id: app.id,
			name: app.name || 'Team Member',
			title: s.title || posting?.title || 'Team Member',
			department: s.department || posting?.department || null,
			employeeId: s.employeeId || deriveEmployeeNo(app.id),
			photoUrl: typeof s.photoUrl === 'string' && s.photoUrl ? s.photoUrl : null,
			workEmail: typeof s.workEmail === 'string' && s.workEmail ? s.workEmail : null,
			bio: typeof s.bio === 'string' && s.bio ? s.bio : null,
			skills: Array.isArray(s.skills) ? s.skills.slice(0, 20).map((x) => String(x).slice(0, 40)) : [],
			socials: s.socials && typeof s.socials === 'object' ? s.socials : null,
			location: typeof s.location === 'string' && s.location ? s.location : null,
			verified: Boolean(s.verified),
			startDate: s.hiredAt || app.created || null,
		});
	} catch (err) { next(err); }
});

export default router;
