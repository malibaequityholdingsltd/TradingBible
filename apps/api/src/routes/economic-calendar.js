// Live economic calendar sourced from Forex Factory's public weekly feed
// (forexfactory.com/calendar, distributed as JSON via faireconomy.media).
// Returns real scheduled macro events with impact, forecast, previous and
// actual values. Falls back to a truthful "unavailable" payload on failure
// rather than fabricating events.

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

export default async (req, res) => {
	try {
		const upstream = await fetch(FF_URL, {
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradingBible/1.0)' },
		});
		if (!upstream.ok) {
			return res.json({ source: 'forexfactory', available: false, reason: `Provider error (${upstream.status}).`, events: [] });
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
		return res.json({ source: 'forexfactory', available: true, events });
	} catch (err) {
		return res.json({ source: 'forexfactory', available: false, reason: 'Could not reach the Forex Factory calendar feed.', events: [] });
	}
};
