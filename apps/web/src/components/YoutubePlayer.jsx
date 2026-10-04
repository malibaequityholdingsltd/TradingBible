import React, { useEffect, useRef } from 'react';
import { checkYoutubeReachable } from '@/lib/liveChannels';

// YouTube player built for guaranteed autostart:
// 1. The iframe renders immediately with muted autoplay baked into the URL —
//    motion starts with zero script dependencies.
// 2. The IFrame API attaches in the background for sound control + playback
//    confirmation. If the API is blocked, playback still runs; only the
//    sound toggle stays hidden.
// 3. A stall watchdog surfaces the helpful slate if nothing plays in time.
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
      setTimeout(() => reject(new Error('yt api timeout')), 15000);
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

  useEffect(() => {
    let cancelled = false;
    let player = null;
    let played = false;
    const markPlaying = () => {
      if (cancelled || played) return;
      played = true;
      playingRef.current?.(true);
    };
    // Stall watchdog: assume playback shortly after load when the API can't
    // confirm (muted autoplay via URL rarely fails once reachable).
    const fallback = setTimeout(markPlaying, 9000);
    // If YouTube itself is unreachable from this browser (offline, VPN /
    // proxy wall, DNS block, aggressive blocker), fail fast with a helpful
    // slate instead of a dead "refused to connect" frame.
    checkYoutubeReachable().then((ok) => {
      if (cancelled) return;
      if (!ok) {
        clearTimeout(fallback);
        try { blockedRef.current?.(true); } catch { /* noop */ }
        return;
      }
      loadApi()
        .then((YT) => {
          if (cancelled || !frameRef.current) return;
          player = new YT.Player(frameRef.current, {
            events: {
              onReady: (e) => {
                try {
                  e.target.mute();
                  e.target.playVideo();
                } catch { /* autoplay proceeds muted or waits */ }
                if (ref) ref.current = e.target;
                try { apiRef.current?.(true); } catch { /* noop */ }
              },
              onStateChange: (e) => {
                if (e?.data === window.YT?.PlayerState?.PLAYING) {
                  if (ref) ref.current = e.target;
                  try { apiRef.current?.(true); } catch { /* noop */ }
                  markPlaying();
                } else if (e?.data === window.YT?.PlayerState?.ENDED) {
                  // Stream/VOD ended — hand back to the auto-advance chain
                  // so the next desk starts with no tap.
                  playingRef.current?.(false);
                }
              },
              onError: () => playingRef.current?.(false),
            },
          });
          playerRef.current = player;
        })
        // API failure is never a playback failure: the muted-autoplay URL
        // runs without any script. Only report dead if nothing played yet —
        // otherwise a blocked API script would slate over a live picture.
        .catch(() => { if (!played) playingRef.current?.(false); });
    });
    return () => {
      cancelled = true;
      clearTimeout(fallback);
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
      onLoad={() => { try { loadedRef.current?.(); } catch { /* noop */ } }}
    />
  );
});

export default YoutubePlayer;
