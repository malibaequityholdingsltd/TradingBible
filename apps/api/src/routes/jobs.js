import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';

const router = Router();

// ── GET /jobs — open postings for the public careers board ──────
router.get('/', async (req, res) => {
	try {
		const rows = await supabaseRest('/rest/v1/job_postings', {
			query: { select: 'id,title,department,employmentType,location,description,requirements,created', status: 'eq.open', order: 'created.desc', limit: 100 },
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
			query: { select: 'id,status', limit: 1 },
		});
		if (!jobs?.[0] || jobs[0].status !== 'open') return res.status(404).json({ error: 'opening not found' });
		const created = await supabaseRest('/rest/v1/job_applications', {
			method: 'POST',
			body: {
				jobId,
				name,
				email,
				phone: String(req.body?.phone || '').trim().slice(0, 40) || null,
				coverLetter: String(req.body?.coverLetter || '').trim().slice(0, 5000) || null,
				status: 'new',
			},
			prefer: 'return=representation', query: { select: 'id' },
		});
		res.status(201).json({ id: created?.[0]?.id || null, status: 'received' });
	} catch (err) {
		logger.error('job apply failed', String(err));
		res.status(500).json({ error: 'could not submit application' });
	}
});

export default router;
