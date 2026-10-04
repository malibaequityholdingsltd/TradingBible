import { useCallback, useEffect, useRef, useState } from 'react';
import { API_SERVER_URL } from '@/lib/apiServerClient';

// Shared YouTube live-status poll. The API probes each channel's broadcast
// state (POST /ads/channels/live, cached server-side 5 min) and every hook
// consumer shares one module-level poll — widget and /tv never double-hit.
// States per channel id: { live: true | false | null } where null means
// unknown (probe blocked, non-YouTube, or not checked yet).
const POLL_MS = 300000;
const NOTIFY_KEY = 'tb:tv-notify';

const shared = {
	states: {},
	checkedAt: 0,
	checking: false,
	payloadKey: '',
	confirmed: new Set(),
	listeners: new Set(),
	timer: null,
	inflight: null,
	prev: {},
	onGoLive: null,
};

function payloadFor(channels) {
	return (Array.isArray(channels) ? channels : [])
		.filter((c) => c && (c.id || c.url))
		.map((c) => ({ id: String(c.id || c.url), url: c.url || '', embedUrl: c.embedUrl || c.url || '' }));
}

async function runFetch(payload) {
	try {
		const res = await fetch(`${API_SERVER_URL}/ads/channels/live`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ channels: payload }),
		});
		if (!res.ok) throw new Error('live check failed');
		const data = await res.json();
		shared.states = data?.states && typeof data.states === 'object' ? data.states : {};
		shared.checkedAt = Date.now();
	} catch {
		// Keep last-known states; unknown is honest, offline-looking is not.
	} finally {
		shared.checking = false;
		shared.inflight = null;
		shared.listeners.forEach((fn) => { try { fn(); } catch { /* noop */ } });
	}
}

function ensurePoll(payload, key) {
	if (key !== shared.payloadKey) {
		shared.payloadKey = key;
		shared.prev = {};
	}
	const stale = Date.now() - shared.checkedAt > POLL_MS;
	if (!shared.inflight && (stale || !Object.keys(shared.states).length)) {
		shared.checking = true;
		shared.inflight = runFetch(payload).then(() => {
			// Go-live flips: known off-air (false) → confirmed live (true).
			// First sightings (no previous false) never notify.
			Object.entries(shared.states).forEach(([id, st]) => {
				const was = shared.prev[id]?.live;
				if (st?.live === true && was === false && typeof shared.onGoLive === 'function') {
					try { shared.onGoLive(id, st); } catch { /* noop */ }
				}
			});
			shared.prev = { ...shared.states };
		});
	}
	if (!shared.timer) {
		shared.timer = setInterval(() => {
			if (document.hidden) return;
			shared.checking = true;
			shared.listeners.forEach((fn) => { try { fn(); } catch { /* noop */ } });
			ensurePoll(payload, key);
		}, POLL_MS);
	}
}

export function isNotifyEnabled() {
	try { return localStorage.getItem(NOTIFY_KEY) === '1'; } catch { return false; }
}

export function setNotifyEnabled(on) {
	try { localStorage.setItem(NOTIFY_KEY, on ? '1' : '0'); } catch { /* ignore */ }
	if (on && typeof Notification !== 'undefined' && Notification.permission === 'default') {
		Notification.requestPermission().catch(() => {});
	}
}

// channels: merged live-channel list. { notify:true } (TvWidget only) fires
// go-live toasts + browser notifications; read-only consumers omit it.
export function useLiveStatus(channels, { notify = false } = {}) {
	const [, setTick] = useState(0);
	const [bell, setBell] = useState(isNotifyEnabled);
	const channelsRef = useRef(channels);
	channelsRef.current = channels;
	const notifyRef = useRef(notify);
	notifyRef.current = notify;

	const fireGoLive = useCallback((id, st) => {
		const list = Array.isArray(channelsRef.current) ? channelsRef.current : [];
		const ch = list.find((c) => String(c.id || c.url) === String(id));
		const title = ch?.title || 'A channel';
		window.dispatchEvent(new CustomEvent('tb:tv-golive', { detail: { id, title, videoId: st?.videoId, liveTitle: st?.title || null } }));
		if (isNotifyEnabled() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
			try { new Notification(`🔴 ${title} is live`, { body: 'Tap to watch on TradingBible TV', tag: `tb-live-${id}` }); } catch { /* noop */ }
		}
	}, []);

	useEffect(() => {
		if (notifyRef.current) shared.onGoLive = fireGoLive;
		const payload = payloadFor(channelsRef.current);
		const key = payload.map((c) => c.id).sort().join('|');
		const rerender = () => setTick((n) => n + 1);
		shared.listeners.add(rerender);
		if (payload.length) ensurePoll(payload, key);
		else rerender();
		// Re-point the shared poll's notifier at the latest subscriber choice.
		return () => { shared.listeners.delete(rerender); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [channels?.length]);

	const toggleBell = useCallback(() => {
		setBell((b) => {
			setNotifyEnabled(!b);
			return !b;
		});
	}, []);

	const markConfirmed = useCallback((id) => {
		if (!id) return;
		shared.confirmed.add(String(id));
		shared.listeners.forEach((fn) => { try { fn(); } catch { /* noop */ } });
	}, []);

	const liveOf = (c) => {
		if (!c) return null;
		const id = String(c.id || c.url || '');
		if (shared.confirmed.has(id)) return true;
		const st = shared.states[id];
		return st && typeof st.live === 'boolean' ? st.live : null;
	};

	const liveCount = (Array.isArray(channels) ? channels : []).filter((c) => liveOf(c) === true).length;

	return {
		states: shared.states,
		liveOf,
		liveCount,
		checking: shared.checking,
		lastChecked: shared.checkedAt,
		bell,
		toggleBell,
		markConfirmed,
	};
}
