// One-off seed: populate the community forum so Learn & Connect > Community
// is not an empty shell. Uses only core columns (works pre-migration);
// backfills author metadata once 20260814000000_forum_content_columns.sql
// has been applied. Idempotent.
// Run with: node --env-file=.env scripts/seed-forum.js
import { supabaseRest } from '../src/utils/supabaseClient.js';

const ADMIN_ID = 'b53aa9b1-8b97-41e1-80fe-ca4f2c2d934c';
const ADMIN_NAME = 'maliba-admin';
const ADMIN_AVATAR = '';

const THREADS = [
	{
		title: 'Welcome to the TradingBible community',
		category: 'General',
		body: 'This is the home for TradingBible members. Introduce yourself, ask questions about the platform, and share what you are working on. Please keep discussions respectful — the forum is ranked by real contributions, and good questions earn the best replies.',
	},
	{
		title: 'Strategy: risk 1% per trade, no exceptions',
		category: 'Strategies',
		body: 'Position sizing is the single most important lever. With a 1% fixed-fraction risk model, a 40% win rate with a 2R average winner still compounds. What risk model do you trade, and why?',
	},
	{
		title: 'The psychological trap: revenge trading after a loss',
		category: 'Psychology',
		body: 'After a stop-out the urge to "get it back" is the strongest edge killer there is. My rule: after any loss, close the charts for 30 minutes and write down what happened. Curious how others reset after a bad day.',
	},
];

async function run() {
	const existing = await supabaseRest('/rest/v1/forum_threads', { query: { select: 'id', limit: 1 } });
	const hasThreads = Array.isArray(existing) && existing.length > 0;

	let ids = {};
	if (!hasThreads) {
		ids = {};
		for (const t of THREADS) {
			const row = await supabaseRest('/rest/v1/forum_threads', {
				method: 'POST',
				body: { owner: ADMIN_ID, title: t.title, body: t.body },
				prefer: 'return=representation',
			});
			ids[t.title] = row?.[0]?.id;
			console.log('seeded thread:', t.title);
		}

		const replies = await supabaseRest('/rest/v1/forum_replies', {
			method: 'POST',
			body: {
				owner: ADMIN_ID,
				thread: ids['Welcome to the TradingBible community'],
				body: 'Welcome, everyone. Introduce yourself below and share what you trade — futures, forex, crypto or stocks. This community only works if members participate.',
			},
			prefer: 'return=representation',
		});
		console.log('seeded reply:', replies?.[0]?.id);
	} else {
		console.log('forum already has threads, skipping inserts');
	}

	// Backfill author metadata (only possible after the migration is applied).
	try {
		const threads = await supabaseRest('/rest/v1/forum_threads', { query: { select: 'id,title,category,"authorName"', limit: 500 } });
		const replies = await supabaseRest('/rest/v1/forum_replies', { query: { select: 'id,body,"authorName"', limit: 500 } });
		const patch = { authorName: ADMIN_NAME, authorAvatar: ADMIN_AVATAR };
		const threadsNeed = (threads || []).filter((t) => !t.authorName);
		const repliesNeed = (replies || []).filter((r) => !r.authorName);
		for (const t of threadsNeed) {
			await supabaseRest(`/rest/v1/forum_threads?id=eq.${t.id}`, {
				method: 'PATCH',
				body: { ...patch, category: THREADS.find((x) => x.title === t.title)?.category || 'General', replyCount: 0 },
			});
		}
		for (const r of repliesNeed) {
			await supabaseRest(`/rest/v1/forum_replies?id=eq.${r.id}`, { method: 'PATCH', body: patch });
		}
		console.log(`backfilled metadata: ${threadsNeed.length} threads, ${repliesNeed.length} replies`);
	} catch (err) {
		console.log('metadata backfill skipped (run again after pushing the migration):', err.message);
	}

	const count = await supabaseRest('/rest/v1/forum_threads?select=count', {});
	console.log('forum_threads rows:', JSON.stringify(count));
	process.exit(0);
}

run().catch((err) => {
	console.error('seed failed:', err.message);
	process.exit(1);
});