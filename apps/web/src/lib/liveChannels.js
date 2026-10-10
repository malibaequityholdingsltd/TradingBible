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
const YOUTUBE_LOCKDOWN = 'autoplay=1&mute=1&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&cc_load_policy=0';

// Primary embed host: www.youtube.com. youtube-nocookie.com serves the
// identical player and remains the automatic fallback (see swapEmbedHost),
// but nocookie is refused on several networks — and a blocked default means
// every desk fails before the fallback can save it. Default to the host
// that plays widest; the consent-wall tradeoff only affects UK/EU viewers.
const YT_EMBED_HOST = 'https://www.youtube.com/embed';

function ytLive(channelId) {
	return `${YT_EMBED_HOST}/live_stream?channel=${channelId}&${YOUTUBE_LOCKDOWN}`;
}

// Direct video embed with the same lockdown — fallback when a channel's
// live_stream endpoint errors but the probe confirmed a live video id
// (owner-restricted live endpoints sometimes still play direct).
export function ytVideoEmbed(videoId) {
	return `${YT_EMBED_HOST}/${videoId}?${YOUTUBE_LOCKDOWN}`;
}

export const LIVE_CHANNELS = [
	{
		id: 'bloomberg-news-live',
		title: 'Bloomberg News Live',
		desk: 'News',
		url: 'https://www.youtube.com/@Bloomberg-News/live',
		embedUrl: ytLive('UChirEOpgFCupRAk5etXqPaA'),
		blurb: 'Bloomberg News live desk — breaking global news coverage.',
		isNew: true,
		plan: 'pro',
	},
	{
		id: 'bloomberg-originals-live',
		title: 'Bloomberg Originals Live',
		desk: 'Originals',
		url: 'https://www.youtube.com/@business/live',
		embedUrl: ytLive('UCUMZ7gohGI9HcU9VNsr2FJQ'),
		blurb: 'Originals, documentaries and long-form live coverage.',
		isNew: true,
		plan: 'pro',
	},
	{
		id: 'bloomberg-explained-live',
		title: 'Bloomberg Quicktake: Explained',
		desk: 'Explained',
		url: 'https://www.youtube.com/@bloombergexplained/live',
		embedUrl: ytLive('UCU1Pp4a-TwbrB40ja-4JG_Q'),
		blurb: 'Quicktake Explained — the numbers and stories behind the news, live.',
		isNew: true,
		plan: 'pro',
	},
	{
		id: 'bloomberg-markets-live',
		title: 'Bloomberg Markets Live',
		desk: 'Markets',
		url: 'https://www.youtube.com/@markets/live',
		embedUrl: ytLive('UCIALMKvObZNtJ6AmdCLP7Lg'),
		blurb: 'Bloomberg Markets — live market-hours coverage and analysis.',
		isNew: true,
		plan: 'pro',
		roundTheClock: false,
		hours: 'Weekdays · live market hours ET',
	},
	{
		id: 'et-now-live',
		title: 'ET Now Live',
		desk: 'India',
		url: 'https://www.youtube.com/@ETNow',
		embedUrl: ytLive('UCI_mwTKUhicNzFrhm33MzBQ'),
		blurb: 'India market hours — stocks, business news and live events.',
		isNew: true,
		plan: 'pro',
		roundTheClock: false,
		hours: 'Daily live blocks IST',
	},
	{
		id: 'times-now-live',
		title: 'Times Now Live',
		desk: 'India',
		url: 'https://www.youtube.com/@TimesNow',
		embedUrl: ytLive('UC6RJ7-PaXg6TIH2BzZfTV7w'),
		blurb: 'Breaking news and live debates with market-moving headlines.',
		isNew: true,
		plan: 'pro',
		roundTheClock: false,
		hours: 'Daily live blocks IST',
	},
	{
		id: 'mirror-now-live',
		title: 'Mirror Now Live',
		desk: 'India',
		url: 'https://www.youtube.com/c/mirrornow',
		embedUrl: ytLive('UCWCEYVwSqr7Epo6sSCfUgiw'),
		blurb: 'Live news, business and market coverage from Mumbai.',
		isNew: true,
		plan: 'pro',
		roundTheClock: false,
		hours: 'Daily live blocks IST',
	},
	{
		id: 'nbc-news-live',
		title: 'NBC News NOW Live',
		desk: 'US',
		url: 'https://www.youtube.com/@NBCNews',
		embedUrl: ytLive('UCeY0bbntWzzVIaj2z3QigXg'),
		blurb: 'NBC News NOW streaming — breaking US news around the clock.',
		isNew: true,
		plan: 'elite',
		roundTheClock: true,
	},
	{
		id: 'cnn-live',
		title: 'CNN Headlines 24/7',
		desk: 'US',
		url: 'https://www.youtube.com/cnn',
		embedUrl: ytLive('UCupvZG-5ko_eiXAupbDfxWw'),
		blurb: 'CNN Headlines 24/7 live news stream.',
		isNew: true,
		plan: 'elite',
		roundTheClock: true,
	},
	{
		id: 'sky-news-live',
		title: 'Sky News Live',
		desk: 'UK',
		url: 'https://www.youtube.com/@SkyNews',
		embedUrl: ytLive('UCoMdktPbSTixAyNGwb-UYkQ'),
		blurb: '24/7 breaking news, business and market headlines from London.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'livenow-fox-live',
		title: 'LiveNOW from FOX',
		desk: 'US',
		url: 'https://www.youtube.com/@livenowfox',
		embedUrl: ytLive('UCJg9wBPyKMNA5sRDnvzmkdg'),
		blurb: 'Raw live coverage — top stories, events and breaking news 24/7.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'goodlife-radio-live',
		title: 'The Good Life Radio',
		desk: 'Music',
		url: 'https://www.youtube.com/@TheGoodLiferadio',
		embedUrl: ytLive('UChs0pSaEoNLV4mevBFGaoKA'),
		blurb: '24/7 deep house radio — relaxing focus music for trading sessions.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'goodlife-deep-house',
		title: 'Deep House Radio 24/7',
		desk: 'Music',
		url: 'https://www.youtube.com/watch?v=IkmLXvBfVv0',
		embedUrl: ytVideoEmbed('IkmLXvBfVv0'),
		blurb: 'Nonstop deep house — summer mixes, gym and workout energy.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'goodlife-chill-mix',
		title: 'Chill Out Music Mix 24/7',
		desk: 'Music',
		url: 'https://www.youtube.com/watch?v=m52ynxt1mOo',
		embedUrl: ytVideoEmbed('m52ynxt1mOo'),
		blurb: 'Chillout lounge and tropical house, streaming round the clock.',
		isNew: true,
		plan: 'pro',
		roundTheClock: true,
	},
	{
		id: 'goodlife-lounge',
		title: 'Chillout Lounge 24/7',
		desk: 'Music',
		url: 'https://www.youtube.com/watch?v=9UMxZofMNbA',
		embedUrl: ytVideoEmbed('9UMxZofMNbA'),
		blurb: 'Calm background music for study, work, sleep and meditation.',
		isNew: true,
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
		id: 'kitco-news-live',
		title: 'Kitco NEWS Live',
		desk: 'Gold',
		url: 'https://www.youtube.com/@kitco/live',
		embedUrl: ytLive('UC9ijza42jVR3T6b8bColgvg'),
		blurb: 'Gold, silver and macro interviews — live event coverage.',
		isNew: true,
		plan: 'elite',
		hours: 'Breaking coverage + daily roundups ET',
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
		hours: 'Weekdays · live from Squawk Box 6a ET',
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
		hours: 'Weekdays · 6a–5p ET from Mornings',
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
		hours: 'Weekdays · 8a–4p ET Toronto floor',
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
	if (!/(youtube\.com|youtube-nocookie\.com)\/embed\//.test(u)) return u;
	const sep = u.includes('?') ? '&' : '?';
	const missing = YOUTUBE_LOCKDOWN.split('&').filter((p) => {
		const k = p.split('=')[0];
		return !new RegExp(`[?&]${k}=`).test(u);
	});
	return missing.length ? `${u}${sep}${missing.join('&')}` : u;
}

// Coerce any YouTube watch/live/shorts/share URL into a proper embed URL.
// Loading a watch or channel page inside an iframe answers with
// X-Frame-Options: SAMEORIGIN, which surfaces as ERR_BLOCKED_BY_RESPONSE.
// Returns null when the URL names no playable video (channel/live pages
// without a probe-confirmed videoId) so callers show the off-air slate
// instead of a dead frame.
export function youtubeEmbedUrl(url) {
  const u = String(url || '');
  if (/(youtube\.com|youtube-nocookie\.com)\/embed\//.test(u)) return u;
  const m = u.match(/(?:youtube\.com\/(?:watch\?[^#]*v=|live\/|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return null;
}
// Host swap: youtube-nocookie.com and www.youtube.com serve the identical
// player, but networks/blockers often allow one and refuse the other.
// Retrying the same video on the alternate host recovers desks that would
// otherwise show a dead "refused to connect" frame.
export function swapEmbedHost(url) {
  const u = String(url || '');
  if (u.includes('www.youtube-nocookie.com')) return u.replace('www.youtube-nocookie.com', 'www.youtube.com');
  if (u.includes('www.youtube.com')) return u.replace('www.youtube.com', 'www.youtube-nocookie.com');
  return u;
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

// ── Local-time schedules ─────────────────────────────────────────────
// Channel `hours` are written in their home zone (ET / UK / IST).
// These helpers detect the viewer's timezone and rewrite the times into it,
// so "6a–5p ET" reads correctly whether the viewer is in London or Lagos.

const SOURCE_ZONES = [
  { token: 'ET', zone: 'America/New_York' },
  { token: 'UK', zone: 'Europe/London' },
  { token: 'IST', zone: 'Asia/Kolkata' },
];

function zoneOffsetMinutes(zone, date) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = {};
    for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
    const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, (+parts.hour % 24), +parts.minute, +parts.second);
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return 0;
  }
}

export function getUserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function localZoneAbbr() {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((x) => x.type === 'timeZoneName');
    return (p && p.value) || '';
  } catch {
    return '';
  }
}

function to24(h, m, mer) {
  let out = (+h % 12) + (mer === 'p' ? 12 : 0);
  if (+h === 12) out = mer === 'p' ? 12 : 0;
  return out * 60 + (+m || 0);
}

function fmtLocal(totalMin) {
  const t = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const mm = t % 60;
  const mer = h < 12 ? 'a' : 'p';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return mm ? `${h12}:${String(mm).padStart(2, '0')}${mer}` : `${h12}${mer}`;
}

// Rewrites a channel's `hours` string into the viewer's local timezone.
// Strings without convertible times come back untouched.
export function localizeChannelHours(channel) {
  const raw = String(channel?.hours || '');
  if (!raw) return raw;
  const src = SOURCE_ZONES.find((s) => new RegExp(`\\b${s.token}\\b`).test(raw));
  if (!src) return raw;
  try {
    const now = new Date();
    const delta = -now.getTimezoneOffset() - zoneOffsetMinutes(src.zone, now);
    if (!delta) return raw; // viewer is already in the schedule's zone
    const abbr = localZoneAbbr();
    const suffix = abbr ? ` ${abbr}` : '';
    const token = src.token;
    const rangeRe = new RegExp(`(\\d{1,2})(?::(\\d{2}))?\\s*([ap])?\\s*[–—-]\\s*(\\d{1,2})(?::(\\d{2}))?\\s*([ap])(\\s*${token})?`, 'gi');
    let out = raw.replace(rangeRe, (m, h1, m1, mer1, h2, m2, mer2, z) => {
      const sMer = (mer1 || mer2 || 'a').toLowerCase();
      const eMer = (mer2 || mer1 || 'a').toLowerCase();
      const s = fmtLocal(to24(h1, m1, sMer) + delta);
      const e = fmtLocal(to24(h2, m2, eMer) + delta);
      return `${s}–${e}${z ? suffix : ''}`;
    });
    const singleRe = new RegExp(`(\\d{1,2})(?::(\\d{2}))?\\s*([ap])\\s*${token}`, 'gi');
    out = out.replace(singleRe, (m, h, mm, mer) => `${fmtLocal(to24(h, mm, mer.toLowerCase()) + delta)}${suffix}`);
    return out;
  } catch {
    return raw;
  }
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
