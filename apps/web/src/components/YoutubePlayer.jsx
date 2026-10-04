import React, { useEffect, useRef } from 'react';
import { checkYoutubeReachable } from '@/lib/liveChannels';

// YouTube player built for guaranteed autostart, zero touches:
// 1. The iframe renders immediately with muted autoplay baked into the URL —
//    motion starts with zero script dependencies.
// 2. The IFrame API attaches in the background and ENFORCES playback: any
//    cued / unstarted / paused state gets an immediate mute + playVideo
//    (the no-touch shield means no pause is ever user-initiated, so every
//    pause is unwanted). A poll backs the events up; tries are capped, then
//    the stream is reported dead and the parents auto-advance.
// 3. A precise stall verdict at 12s: frame never loaded → dead; API alive
//    but never playing → dead; loaded with no API → assume playing (muted
//    autoplay via URL needs no script).
// No pause/play UI is ever exposed — the stream runs once started.

let apiPromise = null;

function loadApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => { apiPromise = null; reject(new Error('yt api failed')); };
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      document.head.appendChild(tag);
      // A stale rejected promise must never poison later channel changes —
      // reset so the next mount retries the script fresh.
      setTimeout(() => { apiPromise = null; reject(new Error('yt api timeout')); }, 15000);
    });
  }
  return apiPromise;
}

const YoutubePlayer = React.forwardRef(function YoutubePlayer({ src, title, onPlaying, onBlocked, onApiReady, onLoaded }, ref) {
  const frameRef = useRef(null);
  const playerRef = useRef(null);
  const playingRef = useRef(onPlaying);
  playingRef.current = onPlaying;
  const blockedRef = useRef(onBlocked);
  blockedRef.current = onBlocked;
  const apiRef = useRef(onApiReady);
  apiRef.current = onApiReady;
  const loadedRef = useRef(onLoaded);
  loadedRef.current = onLoaded;
  const loadedFlag = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let player = null;
    let played = false;
    loadedFlag.current = false;
    let apiOk = false;
    let playTries = 0;
    const markPlaying = () => {
      if (cancelled || played) return;
      played = true;
      playingRef.current?.(true);
    };
    const reportDead = () => {
      if (cancelled || played) return;
      played = true;
      try { playingRef.current?.(false); } catch { /* noop */ }
    };
    // Play enforcer: resume anything that isn't moving. Never loops forever
    // — after 6 failed plays the stream is declared dead for auto-advance.
    const forcePlay = () => {
      if (cancelled || played) return;
      try {
        const p = playerRef.current;
        if (!p) return;
        let st = null;
        try { st = p.getPlayerState?.(); } catch { /* noop */ }
        const PS = window.YT?.PlayerState;
        if (st === PS?.PLAYING || st === PS?.BUFFERING) return;
        if (playTries >= 6) { reportDead(); return; }
        playTries++;
        try { p.mute?.(); } catch { /* noop */ }
        try { p.playVideo?.(); } catch { /* noop */ }
      } catch { /* noop */ }
    };
    // Precise stall verdict at 12s (replaces the old assume-playing timer).
    const verdict = setTimeout(() => {
      if (cancelled || played) return;
      if (!loadedFlag.current || apiOk) reportDead();
      else markPlaying();
    }, 12000);
    const enforcer = setInterval(forcePlay, 2500);
    // If YouTube itself is unreachable from this browser (offline, VPN /
    // proxy wall, DNS block, aggressive blocker), fail fast with a helpful
    // slate instead of a dead "refused to connect" frame.
    checkYoutubeReachable().then((ok) => {
      if (cancelled) return;
      if (!ok) {
        clearTimeout(verdict);
        clearInterval(enforcer);
        try { blockedRef.current?.(true); } catch { /* noop */ }
        return;
      }
      loadApi()
        .then((YT) => {
          if (cancelled || !frameRef.current) return;
          player = new YT.Player(frameRef.current, {
            events: {
              onReady: (e) => {
                apiOk = true;
                playTries++;
                try {
                  e.target.mute();
                  e.target.playVideo();
                } catch { /* enforcer retries */ }
                if (ref) ref.current = e.target;
                try { apiRef.current?.(true); } catch { /* noop */ }
              },
              onStateChange: (e) => {
                const PS = window.YT?.PlayerState;
                if (e?.data === PS?.PLAYING) {
                  if (ref) ref.current = e.target;
                  try { apiRef.current?.(true); } catch { /* noop */ }
                  markPlaying();
                } else if (e?.data === PS?.ENDED) {
                  // Stream/VOD ended — hand back to the auto-advance chain
                  // so the next desk starts with no tap.
                  reportDead();
                } else if (e?.data === PS?.CUED || e?.data === PS?.PAUSED || e?.data === PS?.UNSTARTED) {
                  // Cued, paused or never started — resume immediately.
                  forcePlay();
                }
              },
              onError: () => reportDead(),
            },
          });
          playerRef.current = player;
        })
        // API failure is never a playback failure: the muted-autoplay URL
        // runs with zero script dependencies, so a blocked/slow API script
        // must never report the stream dead. The 12s verdict assumes
        // playback for loaded-but-API-less frames; genuine player errors
        // still arrive via onError, and a truly unreachable YouTube is
        // caught by the reachability probe.
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      clearTimeout(verdict);
      clearInterval(enforcer);
      if (ref) ref.current = null;
      try { apiRef.current?.(false); } catch { /* noop */ }
      try { playerRef.current?.destroy?.(); } catch { /* noop */ }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      className="absolute inset-0 h-full w-full border-0"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      onLoad={() => {
        loadedFlag.current = true;
        try { loadedRef.current?.(); } catch { /* noop */ }
      }}
    />
  );
});

export default YoutubePlayer;
