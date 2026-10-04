import { useEffect, useState } from 'react';
import { API_SERVER_URL } from '@/lib/apiServerClient';

// TradingBible TV — live channel guide.
// Built-in catalog: official YouTube live desks (Bloomberg 24/7, Yahoo
// Finance 24/7, Schwab Network). Everything else is admin-managed: the API
// serves enabled channels on GET /ads (`channels`), and useLiveChannels
// merges them after the built-in entries. We do not hotlink or rebroadcast
// streams; framing shows each provider's own player.

// YouTube player lockdown: autoplay on select, no related-video wall
// (rel=0 keeps any leftovers same-channel), no annotations, minimal
// branding, inline play. Applied to every YouTube embed so viewers can't
// click away to other suggestions. Note: end screens baked in by the channel
// owner can't be suppressed by any parameter.
const YOUTUBE_LOCKDOWN = 'autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1';

function ytLive(channelId) {
	return `https://www.youtube.com/embed/live_stream?channel=${channelId}&${YOUTUBE_LOCKDOWN}`;
}

export const LIVE_CHANNELS = [
	{
		id: 'bloomberg-yt-live',
		title: 'Bloomberg TV — YouTube Live',
		desk: 'Global',
		url: 'https://www.youtube.com/@markets/live',
		embedUrl: ytLive('UCIALMKvObZNtJ6AmdCLP7Lg'),
		blurb: 'Official 24/7 stream — plays instantly in the player, no login.',
		isNew: false,
		plan: 'pro',
	},
	{
		id: 'yahoo-finance-live',
		title: 'Yahoo Finance 24/7',
		desk: 'Stocks',
		url: 'https://www.youtube.com/@YahooFinance/live',
		embedUrl: ytLive('UCEAZeUIeJs0IjQiqTCdVSIg'),
		blurb: 'Nonstop market coverage — Opening Bid to Market Domination.',
		isNew: true,
		plan: 'elite',
	},
	{
		id: 'schwab-network-live',
		title: 'Schwab Network Live',
		desk: 'Markets',
		url: 'https://www.youtube.com/@SchwabNetwork/live',
		embedUrl: ytLive('UCqoSrYgusd8ZddtMoWhjHYA'),
		blurb: 'Live trader talk — options, futures and market strategy.',
		isNew: true,
		plan: 'professional',
	},
];

function sanitizeRemote(row, i) {
	const url = String(row?.url || '').trim();
	if (!/^https:\/\//.test(url)) return null;
	const plan = ['pro', 'elite', 'professional'].includes(String(row?.plan || '').toLowerCase())
		? String(row.plan).toLowerCase()
		: 'pro';
	return {
		id: String(row?.id || row?.key || `admin-${i}`),
		title: String(row?.title || 'Live channel').slice(0, 80),
		desk: String(row?.desk || 'Live').slice(0, 24),
		url,
		embedUrl: /^https:\/\//.test(String(row?.embedUrl || '')) ? String(row.embedUrl) : '',
		blurb: String(row?.blurb || '').slice(0, 160),
		isNew: Boolean(row?.isNew),
		plan,
	};
}

// Appends the lockdown params to any YouTube embed URL that lacks them
// (covers admin-added YouTube embeds too). Non-YouTube URLs pass through.
export function hardenEmbed(url) {
	const u = String(url || '');
	if (!/youtube\.com\/embed\//.test(u)) return u;
	const sep = u.includes('?') ? '&' : '?';
	const missing = YOUTUBE_LOCKDOWN.split('&').filter((p) => {
		const k = p.split('=')[0];
		return !new RegExp(`[?&]${k}=`).test(u);
	});
	return missing.length ? `${u}${sep}${missing.join('&')}` : u;
}
// Falls back to built-in only when the feed is unreachable.
export function useLiveChannels() {
	const [channels, setChannels] = useState(LIVE_CHANNELS);
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`${API_SERVER_URL}/ads`);
				if (!res.ok) return;
				const data = await res.json();
				const remote = Array.isArray(data.channels) ? data.channels : [];
				if (cancelled || !remote.length) return;
				const seen = new Set(LIVE_CHANNELS.map((c) => c.url));
				const merged = [...LIVE_CHANNELS];
				remote.forEach((r, i) => {
					const c = sanitizeRemote(r, i);
					if (c && !seen.has(c.url)) {
						seen.add(c.url);
						merged.push(c);
					}
				});
				if (!cancelled) setChannels(merged);
			} catch { /* built-in list stands alone */ }
		})();
		return () => { cancelled = true; };
	}, []);
	return channels;
}
