import React, { useEffect, useRef } from 'react';
import { checkYoutubeReachable } from '@/lib/liveChannels';

// YouTube IFrame API player. Browsers block unmuted autoplay, so the player
// starts muted (guaranteed motion) and the parent offers a "tap for sound"
// control outside the video frame that unmutes via the API. No pause/play
// UI is ever exposed — the stream runs continuously once started.

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

const YoutubePlayer = React.forwardRef(function YoutubePlayer({ src, title, onPlaying, onBlocked }, ref) {
  const frameRef = useRef(null);
  const playerRef = useRef(null);
  const playingRef = useRef(onPlaying);
  playingRef.current = onPlaying;
  const blockedRef = useRef(onBlocked);
  blockedRef.current = onBlocked;

  useEffect(() => {
    let cancelled = false;
    let player = null;
    // If YouTube itself is unreachable from this browser (offline, VPN /
    // proxy wall, DNS block, aggressive blocker), fail fast with a helpful
    // slate instead of a dead "refused to connect" frame.
    checkYoutubeReachable().then((ok) => {
      if (cancelled) return;
      if (!ok) {
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
              },
              onStateChange: (e) => {
                if (e?.data === window.YT?.PlayerState?.PLAYING) {
                  if (ref) ref.current = e.target;
                  playingRef.current?.(true);
                }
              },
              onError: () => playingRef.current?.(false),
            },
          });
          playerRef.current = player;
        })
        .catch(() => playingRef.current?.(false));
    });
    return () => {
      cancelled = true;
      if (ref) ref.current = null;
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
    />
  );
});

export default YoutubePlayer;
