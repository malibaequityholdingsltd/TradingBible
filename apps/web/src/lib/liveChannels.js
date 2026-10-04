import { useEffect, useState } from 'react';
import { API_SERVER_URL } from '@/lib/apiServerClient';

// TradingBible TV — live channel guide.
// Built-in catalog: official YouTube live desks (Bloomberg 24/7, Yahoo
// Finance 24/7, Schwab Network). Everything else is admin-managed: the API
// serves enabled channels on GET /ads (`channels`), and useLiveChannels
// merges them after the built-in entries. We do not hotlink or rebroadcast
// streams; framing shows each provider's own player.

// YouTube player lockdown: autoplay muted (browsers block unmuted autoplay —
// the app unmutes via the IFrame API on first sound tap), JS API enabled, no
// related-video wall (rel=0 keeps any leftovers same-channel), no
// annotations, minimal branding, inline play. Applied to every YouTube embed
// so viewers can't click away to other suggestions. Note: end screens baked
// in by the channel owner can't be suppressed by any parameter.
const YOUTUBE_LOCKDOWN = 'autoplay=1&mute=1&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1';

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
		roundTheClock: true,
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
		roundTheClock: true,
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
		hours: 'Mon–Fri · 8a–4p CT',
	},
	{
		id: 'kitco-news-live',
		title: 'Kitco NEWS Live',
		desk: 'Gold',
		url: 'https://www.youtube.com/@kitco/live',
		embedUrl: ytLive('UC9ijza42jVR3T6b8bColgvg'),
		blurb: 'Gold, silver and macro interviews — live event coverage.',
		isNew: true,
		plan: 'elite',
		hours: 'Event-driven · US daytime ET',
	},
	{
		id: 'cnbc-live',
		title: 'CNBC Television Live',
		desk: 'US',
		url: 'https://www.youtube.com/@CNBCtelevision/live',
		embedUrl: ytLive('UCrp_UI8XtuYfpiqluWLD7Lw'),
		blurb: 'Wall Street daytime coverage — Squawk Box to Closing Bell.',
		isNew: true,
		plan: 'elite',
		hours: 'Mon–Fri · 5a–7p ET',
	},
	{
		id: 'fox-business-live',
		title: 'Fox Business Live',
		desk: 'US',
		url: 'https://www.youtube.com/@FoxBusiness/live',
		embedUrl: ytLive('UCCXoCcu9Rp7NPbTzIvogpZg'),
		blurb: 'Mornings with Maria to Kudlow — markets and money.',
		isNew: true,
		plan: 'elite',
		hours: 'Mon–Fri · 6a–5p ET',
	},
	{
		id: 'ig-live-trading',
		title: 'IG Live Trading',
		desk: 'London',
		url: 'https://www.youtube.com/channel/UCwvras8SRKKhx_cboj2p1nw/live',
		embedUrl: ytLive('UCwvras8SRKKhx_cboj2p1nw'),
		blurb: 'Daily live shows — Morning Markets, Trade Live US Open.',
		isNew: true,
		plan: 'pro',
		hours: 'Weekdays · London mornings',
	},
	{
		id: 'tastytrade-live',
		title: 'tastylive',
		desk: 'Options',
		url: 'https://www.youtube.com/channel/UCk99MvmvHZutKIkh2u0ImrA/live',
		embedUrl: ytLive('UCk99MvmvHZutKIkh2u0ImrA'),
		blurb: 'Live options and futures shows from the trade desk.',
		isNew: true,
		plan: 'professional',
		hours: 'Mon–Fri · 7a–4p CT',
	},
	{
		id: 'tradertv-live',
		title: 'TraderTV Live',
		desk: 'Day Trade',
		url: 'https://www.youtube.com/channel/UCn75vF3UxwWeWPAY4-5Z6HQ/live',
		embedUrl: ytLive('UCn75vF3UxwWeWPAY4-5Z6HQ'),
		blurb: 'Live day-trading sessions and market opens.',
		isNew: true,
		plan: 'pro',
		hours: 'Mon–Fri · US market hours ET',
	},
	{
		id: 'aje-live',
		title: 'Al Jazeera English 24/7',
		desk: 'World',
		url: 'https://www.youtube.com/@aljazeeraenglish/live',
		embedUrl: ytLive('UCNye-wNBqNL5ZzHSJj3l8Bg'),
		blurb: '24/7 world news with business coverage that moves markets.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'france24-live',
		title: 'France 24 English 24/7',
		desk: 'World',
		url: 'https://www.youtube.com/@France24_en/live',
		embedUrl: ytLive('UCQfwfsi5VrQ8yKZ-UWmAEFg'),
		blurb: '24/7 international news and market-moving headlines.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'euronews-live',
		title: 'Euronews English 24/7',
		desk: 'Europe',
		url: 'https://www.youtube.com/@euronews/live',
		embedUrl: ytLive('UCSrZ3UV4jOidv8ppoVuvW9Q'),
		blurb: '24/7 European and world news with economy coverage.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'dw-live',
		title: 'DW News Livestream',
		desk: 'World',
		url: 'https://www.youtube.com/channel/UCknLrEdhRCp1aegoMqRaCZg/live',
		embedUrl: ytLive('UCknLrEdhRCp1aegoMqRaCZg'),
		blurb: 'Headline news, business and interviews from Berlin.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'trt-world-live',
		title: 'TRT World Live',
		desk: 'World',
		url: 'https://www.youtube.com/c/trtworld/live',
		embedUrl: ytLive('UC7fWeaHhqgM4Ry-RMpM2YYw'),
		blurb: 'Breaking news and business from Istanbul around the clock.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'cna-live',
		title: 'CNA 24/7 Livestream',
		desk: 'Asia',
		url: 'https://www.youtube.com/channel/UC83jt4dlz1Gjl58fzQrrKZg/live',
		embedUrl: ytLive('UC83jt4dlz1Gjl58fzQrrKZg'),
		blurb: '24/7 Asia-first news, business and Money Mind.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'wion-live',
		title: 'WION Live TV',
		desk: 'World',
		url: 'https://www.youtube.com/@WION/live',
		embedUrl: ytLive('UC_gUM8rL-Lrg6O3adPW9K1g'),
		blurb: 'Live world news, business and market wraps from Delhi.',
		isNew: true,
		plan: 'pro',
		hours: 'Daily live blocks IST',
		roundTheClock: false,
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

// Reachability probe: can this browser actually load YouTube? A no-cors
// fetch resolves on any HTTP response (even opaque) and rejects only when
// the network itself fails (DNS blocked, offline, VPN/proxy wall, aggressive
// blocker). Used to show a helpful slate instead of a dead player.
export function checkYoutubeReachable(timeoutMs = 8000) {
	return (async () => {
		try {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), timeoutMs);
			await fetch('https://www.youtube.com/favicon.ico', { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
			clearTimeout(timer);
			return true;
		} catch {
			return false;
		}
	})();
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
