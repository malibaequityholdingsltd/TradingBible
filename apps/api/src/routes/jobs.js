import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';
import {
	provisionEmployee, scoreApplication, emailDomainBlocked, extractUrls, verifySampleUrls,
} from '../utils/hiring.js';

const router = Router();

// ── GET /jobs — open postings for the public careers board ──────
router.get('/', async (req, res) => {
	try {
		const base = 'id,title,department,employmentType,location,description,requirements,created';
		try {
			const rows = await supabaseRest('/rest/v1/job_postings', {
				query: { select: `${base},hiring`, status: 'eq.open', order: 'created.desc', limit: 100 },
			});
			const now = Date.now();
			return res.json((rows || []).filter((j) => {
				const c = j?.hiring && typeof j.hiring === 'object' ? j.hiring.closes_at : null;
				return !c || Number.isNaN(Date.parse(c)) || now < Date.parse(c);
			}));
		} catch (err) {
			if (!/hiring/i.test(String(err))) throw err;
		}
		const rows = await supabaseRest('/rest/v1/job_postings', {
			query: { select: base, status: 'eq.open', order: 'created.desc', limit: 100 },
		});
		res.json(rows || []);
	} catch (err) {
		logger.error('jobs list failed', String(err));
		res.status(500).json({ error: 'could not load openings' });
	}
});

// ── POST /jobs/apply — public job application ───────────────────
router.post('/apply', async (req, res) => {
	try {
		const jobId = String(req.body?.jobId || '').trim();
		const name = String(req.body?.name || '').trim().slice(0, 120);
		const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 160);
		if (!jobId || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return res.status(400).json({ error: 'job, name and a valid email are required' });
		}
		const jobs = await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(jobId)}`, {
			query: { select: 'id,status,department,title', limit: 1 },
		});
		if (!jobs?.[0] || jobs[0].status !== 'open') return res.status(404).json({ error: 'opening not found' });

		// ── Gate 0: honeypot (bots fill it; humans never see it). ──
		// Fooled bots get a fake success and nothing is stored.
		if (String(req.body?.website || '').trim()) {
			logger.warn('job apply honeypot tripped', jobId);
			return res.status(201).json({ id: null, status: 'received' });
		}

		// ── Gate 1: throwaway inboxes can't apply. ──
		if (emailDomainBlocked(email)) {
			return res.status(400).json({ error: 'Please apply with a permanent email address.' });
		}

		// ── Gate 2: one application per person per posting. ──
		const dupes = await supabaseRest('/rest/v1/job_applications', {
			query: { select: 'id', jobId: `eq.${jobId}`, email: `eq.${email}`, limit: 1 }, // RAW: URLSearchParams encodes
			}).catch(() => null);
		if (dupes?.[0]) return res.status(409).json({ error: 'You already applied for this opening.' });

		// Hiring config (screening Qs, samples rule, auto-accept). Added
		// post-deploy — read defensively so a missing column never breaks
		// public applications.
		let autoAccept = false;
		let hiring = {};
		try {
			const flag = await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(jobId)}`, {
				query: { select: 'auto_accept,hiring', limit: 1 },
			});
			autoAccept = flag?.[0]?.auto_accept === true;
			if (flag?.[0]?.hiring && typeof flag[0].hiring === 'object') hiring = flag[0].hiring;
		} catch { /* columns not added yet → open application, no gates */ }

		// ── Collection window: gather the whole pool before anyone is
		// hired, so better candidates are never missed. Past the deadline
		// the opening stops accepting; auto-accept only fires once the
		// window has closed (or when no window was set).
		const closesAt = hiring.closes_at || null;
		const windowClosed = closesAt ? Date.now() >= Date.parse(closesAt) : true;
		if (closesAt && !windowClosed) {
			// window open → collect only (hire decisions come after close)
		} else if (closesAt && windowClosed) {
			return res.status(410).json({ error: 'Applications for this opening have closed.' });
		}

		// ── Gate 3: screening questions (knockouts live here). ──
		const questions = Array.isArray(hiring.screening) ? hiring.screening : [];
		const rawAnswers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
		const answers = {};
		for (let i = 0; i < questions.length; i++) {
			const q = questions[i] || {};
			const a = String(rawAnswers[i] ?? rawAnswers[q.q] ?? '').trim().slice(0, 2000);
			if (q.required !== false && !a) {
				return res.status(400).json({ error: `Please answer screening question ${i + 1}.` });
			}
			if (a) answers[String(q.q || `Q${i + 1}`).slice(0, 140)] = a;
		}

		// ── Gate 4: proof of work (portfolio / sample links, verified live). ──
		const samplesText = String(req.body?.samples || '').trim().slice(0, 2000);
		const sampleUrls = extractUrls(samplesText);
		if (hiring.samples_required === true && !sampleUrls.length) {
			return res.status(400).json({ error: 'Please include at least one link to your work (portfolio, profile, or sample).' });
		}
		const { samples_ok, samples_note } = sampleUrls.length
			? await verifySampleUrls(sampleUrls)
			: { samples_ok: false, samples_note: 'none' };

		// ── Gate 5: originality signals (review flags, never auto-reject). ──
		const coverLetter = String(req.body?.coverLetter || '').trim().slice(0, 5000) || null;
		const { risk_score, risk_flags } = scoreApplication({ coverLetter, posting: jobs[0] });

		let hired = false;
		if (autoAccept && windowClosed) {
			try {
				await provisionEmployee({ name, email, posting: jobs[0] });
				hired = true;
			} catch (err) { logger.error('auto-accept provision failed, keeping application', String(err)); }
		}
		const checks = {
			answers, samples: sampleUrls, samples_ok, samples_note, risk_score, risk_flags,
		};
		let created;
		try {
			created = await supabaseRest('/rest/v1/job_applications', {
				method: 'POST',
				body: {
					jobId,
					name,
					email,
					phone: String(req.body?.phone || '').trim().slice(0, 40) || null,
					coverLetter,
					checks,
					status: hired ? 'hired' : 'new',
				},
				prefer: 'return=representation', query: { select: 'id' },
			});
		} catch (err) {
			if (!/checks/i.test(String(err))) throw err;
			// checks column not added yet — store the application without it.
			created = await supabaseRest('/rest/v1/job_applications', {
				method: 'POST',
				body: {
					jobId,
					name,
					email,
					phone: String(req.body?.phone || '').trim().slice(0, 40) || null,
					coverLetter,
					status: hired ? 'hired' : 'new',
				},
				prefer: 'return=representation', query: { select: 'id' },
			});
		}
		// Never leak credentials publicly — the hire invite email carries login.
		res.status(201).json({ id: created?.[0]?.id || null, status: hired ? 'received-hired' : 'received' });
	} catch (err) {
		logger.error('job apply failed', String(err));
		res.status(500).json({ error: 'could not submit application' });
	}
});

export default router;
