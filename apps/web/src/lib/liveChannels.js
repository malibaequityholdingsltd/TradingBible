import { useEffect, useState } from 'react';
import { API_SERVER_URL } from '@/lib/apiServerClient';

// TradingBible TV — live channel guide.
// Built-in catalog holds only Bloomberg TV (official YouTube live embed,
// plays instantly with no login). Everything else is admin-managed: the API
// serves enabled channels on GET /ads (`channels`), and useLiveChannels
// merges them after the built-in entry. We do not hotlink or rebroadcast
// streams; framing shows each provider's own player.

export const LIVE_CHANNELS = [
	{
		id: 'bloomberg-yt-live',
		title: 'Bloomberg TV — YouTube Live',
		desk: 'Global',
		url: 'https://www.youtube.com/@markets/live',
		embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ6AmdCLP7Lg&autoplay=1',
		blurb: 'Official 24/7 stream — plays instantly in the player, no login.',
		isNew: true,
	},
];

function sanitizeRemote(row, i) {
	const url = String(row?.url || '').trim();
	if (!/^https:\/\//.test(url)) return null;
	return {
		id: String(row?.id || row?.key || `admin-${i}`),
		title: String(row?.title || 'Live channel').slice(0, 80),
		desk: String(row?.desk || 'Live').slice(0, 24),
		url,
		embedUrl: /^https:\/\//.test(String(row?.embedUrl || '')) ? String(row.embedUrl) : '',
		blurb: String(row?.blurb || '').slice(0, 160),
		isNew: Boolean(row?.isNew),
	};
}

// Live channel list: built-in entry first, then admin-added channels.
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
