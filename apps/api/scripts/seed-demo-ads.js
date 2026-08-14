// One-off seed: add a placeholder ad + TV settings so the TV widget feed
// (GET /api/ads) has content. Idempotent — skips existing ad rows.
// Run with: node --env-file=.env scripts/seed-demo-ads.js
import { supabaseRest } from '../src/utils/supabaseClient.js';

const demoAd = {
	key: 'ad:advertise-with-tradingbible',
	provider: 'brand',
	enabled: true,
	config: {
		title: 'Advertise with TradingBible',
		headline: 'Put your brand in front of serious traders. 24/7 broadcasts across our TV network.',
		imageUrl: '',
		videoUrl: '',
		logoUrl: 'https://tradingbible.app/logo.png',
		linkUrl: 'https://tradingbible.app/contact',
		cta: 'Get in touch',
		accent: '#d4af37',
		durationSeconds: 12,
		snippet: 'Reach hundreds of active traders daily.',
		views: 0,
		clicks: 0,
		notes: 'Placeholder ad seeded on setup',
	},
};

async function run() {
	const existing = await supabaseRest('/rest/v1/admin_integrations', {
		query: { select: 'key', 'key': 'like.ad:%', limit: 100 },
	});
	const keys = new Set((existing || []).map((r) => r.key));

	if (keys.has(demoAd.key)) {
		console.log('demo ad already exists, skipping');
	} else {
		const row = await supabaseRest('/rest/v1/admin_integrations', {
			method: 'POST',
			body: demoAd,
			prefer: 'return=representation',
		});
		console.log('seeded ad:', row?.[0]?.key);
	}

	const tv = await supabaseRest('/rest/v1/branding_settings?key=eq.tv_ads', { query: { select: '*', limit: 1 } })
		.then((r) => r?.[0] || null).catch(() => null);
	if (!tv) {
		await supabaseRest('/rest/v1/branding_settings', {
			method: 'POST',
			body: { key: 'tv_ads', value: { rotationSeconds: 12, autoOpenIntervalMinutes: 0, headerText: 'TradingBible TV', footerText: 'Advertise with TradingBible', advertiserEmail: 'ads@tradingbible.app' } },
			prefer: 'return=representation',
		});
		console.log('seeded tv_ads settings');
	} else {
		console.log('tv_ads settings already exist, skipping');
	}

	const feed = await supabaseRest('/rest/v1/admin_integrations', {
		query: { select: '*', 'key': 'like.ad:%', enabled: 'eq.true', order: 'created.asc', limit: 100 },
	});
	console.log('enabled ads now in feed:', (feed || []).length);
	process.exit(0);
}

run().catch((err) => {
	console.error('seed failed:', err.message);
	process.exit(1);
});