// Live economic calendar sourced from Forex Factory's public weekly feed
// (forexfactory.com/calendar, distributed as JSON via faireconomy.media).
// Returns real scheduled macro events with impact, forecast, previous and
// actual values. Falls back to a truthful "unavailable" payload on failure
// rather than fabricating events.
// Admin-curated events (admin_integrations key "cal_event:*") are merged in.

import { supabaseRest } from '../utils/supabaseClient.js';

const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

const IMPACT_MAP = {
	High: 'high',
	Medium: 'medium',
	Low: 'low',
	Holiday: 'low',
};

function parseTime(dateStr) {
	const t = Date.parse(dateStr);
	return Number.isNaN(t) ? null : t;
}

async function fetchCuratedEvents() {
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'key,config,enabled', limit: 500 },
		});
		return (rows || [])
			.filter((r) => r.enabled && String(r.key || '').startsWith('cal_event:'))
			.map((r) => {
				const c = r.config && typeof r.config === 'object' ? r.config : {};
				const time = parseTime(c.time);
				if (!time) return null;
				const actual = c.actual != null && c.actual !== '' ? String(c.actual) : null;
				return {
					id: `curated-${r.key.replace(/[^a-zA-Z0-9]/g, '-')}`,
					country: String(c.country || 'US').slice(0, 8),
					name: String(c.title || 'Economic event').slice(0, 120),
					impact: ['high', 'medium', 'low'].includes(c.impact) ? c.impact : 'medium',
					unit: String(c.unit || '').slice(0, 8),
					time,
					previous: c.previous != null && c.previous !== '' ? String(c.previous) : null,
					forecast: c.forecast != null && c.forecast !== '' ? String(c.forecast) : null,
					actual,
					released: actual != null,
					curated: true,
				};
			})
			.filter(Boolean);
	} catch {
		return [];
	}
}

export default async (req, res) => {
	const curated = await fetchCuratedEvents();
	try {
		const upstream = await fetch(FF_URL, {
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradingBible/1.0)' },
		});
		if (!upstream.ok) {
			return res.json({ source: 'forexfactory', available: false, reason: `Provider error (${upstream.status}).`, events: curated });
		}
		const data = await upstream.json();
		const raw = Array.isArray(data) ? data : [];
		const events = raw.map((e, i) => {
			const time = parseTime(e.date);
			const actual = e.actual != null && e.actual !== '' ? e.actual : null;
			return {
				id: `ff-${i}`,
				country: e.country || '—',
				name: e.title || 'Economic event',
				impact: IMPACT_MAP[e.impact] || 'low',
				unit: '',
				time: time ?? Date.now(),
				previous: e.previous != null && e.previous !== '' ? e.previous : null,
				forecast: e.forecast != null && e.forecast !== '' ? e.forecast : null,
				actual,
				released: actual != null,
			};
		}).filter((e) => e.time).sort((a, b) => a.time - b.time);
		const merged = [...curated, ...events].sort((a, b) => a.time - b.time);
		return res.json({ source: 'forexfactory', available: true, events: merged });
	} catch (err) {
		return res.json({ source: 'forexfactory', available: false, reason: 'Could not reach the Forex Factory calendar feed.', events: curated });
	}
};
