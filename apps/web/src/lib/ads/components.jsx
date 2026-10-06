import React, { useEffect, useRef, useState, useCallback, forwardRef } from 'react';
import { getAdsService, trackImpression, trackClick, trackViewable } from './service.js';

export const AdContext = React.createContext(null);

export function AdProvider({ children, options }) {
  const [service] = useState(() => getAdsService(options));
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    service.initialize().then(() => setInitialized(true));
  }, [service]);

  return (
    <AdContext.Provider value={{ service, initialized }}>
      {children}
    </AdContext.Provider>
  );
}

export function useAds() {
  const context = React.useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within AdProvider');
  }
  return context;
}

export const AdComponent = forwardRef(({
  ad,
  placementId,
  className = '',
  style,
  onLoad,
  onError,
  onClick,
  onImpression,
  onViewable,
  lazy = true,
  viewabilityThreshold = 0.5,
  ...props
}, ref) => {
  const { service, initialized } = useAds();
  const elementRef = useRef(null);
  const impressionTracked = useRef(false);
  const viewableTracked = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [viewable, setViewable] = useState(false);

  const combinedRef = useCallback((node) => {
    elementRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  useEffect(() => {
    if (!ad || !initialized) return;

    if (!impressionTracked.current) {
      impressionTracked.current = true;
      service.trackImpression(ad.id, placementId, { placementType: ad.type });
      onImpression?.(ad, placementId);
    }

    if (lazy && elementRef.current) {
      service.observeViewability(elementRef.current, ad.id, placementId);
      return () => {
        if (elementRef.current) {
          service.unobserveViewability(elementRef.current);
        }
      };
    }
  }, [ad, placementId, initialized, service, lazy, onImpression]);

  const handleClick = useCallback((e) => {
    if (!ad) return;
    service.trackClick(ad.id, placementId);
    if (ad.linkUrl) {
      window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
    }
    onClick?.(ad, placementId, e);
  }, [ad, placementId, service, onClick]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(null);
    onLoad?.(ad, placementId);
  }, [ad, placementId, onLoad]);

  const handleError = useCallback((err) => {
    setError(err);
    setLoaded(false);
    onError?.(err, ad, placementId);
  }, [ad, placementId, onError]);

  if (!ad || !initialized) {
    return null;
  }

  return (
    <div
      ref={combinedRef}
      className={`ad-component ad-${ad.type} ${className}`}
      style={style}
      onClick={handleClick}
      data-ad-id={ad.id}
      data-placement-id={placementId}
      {...props}
    >
      {error && (
        <div className="ad-error" role="alert">
          <span>Ad failed to load</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      {!error && (
        <>
          {ad.type === 'banner' && <BannerAdContent ad={ad} onLoad={handleLoad} onError={handleError} />}
          {ad.type === 'video' && <VideoAdContent ad={ad} onLoad={handleLoad} onError={handleError} />}
          {ad.type === 'native' && <NativeAdContent ad={ad} onLoad={handleLoad} onError={handleError} />}
          {ad.type === 'interstitial' && <InterstitialAdContent ad={ad} onLoad={handleLoad} onError={handleError} />}
          {ad.type === 'rewarded' && <RewardedAdContent ad={ad} onLoad={handleLoad} onError={handleError} />}
          {ad.type === 'sticky' && <StickyAdContent ad={ad} onLoad={handleLoad} onError={handleError} />}
          {ad.type === 'amp' && <AmpAdContent ad={ad} onLoad={handleLoad} onError={handleError} />}
          {ad.type === 'story' && <StoryAdContent ad={ad} placementId={placementId} onLoad={handleLoad} onError={handleError} />}
        </>
      )}
    </div>
  );
});

AdComponent.displayName = 'AdComponent';

// ─── Standalone format components ─────────────────────────────────────
// Thin wrappers over AdComponent that pin the ad type, so callers get a
// named component API (BannerAd, VideoAd, …) instead of having to pass
// `ad={{ ...ad, type: 'banner' }}` by hand. All tracking, viewability,
// frequency and click handling is inherited from AdComponent.
function withAdType(type, displayName) {
  const TypedAd = forwardRef(({ ad, className = '', ...props }, ref) => (
    <AdComponent
      ref={ref}
      ad={ad ? { ...ad, type } : ad}
      className={className}
      {...props}
    />
  ));
  TypedAd.displayName = displayName;
  return TypedAd;
}

export const BannerAd = withAdType('banner', 'BannerAd');
export const VideoAd = withAdType('video', 'VideoAd');
export const NativeAd = withAdType('native', 'NativeAd');
export const InterstitialAd = withAdType('interstitial', 'InterstitialAd');
export const RewardedAd = withAdType('rewarded', 'RewardedAd');
export const AmpAd = withAdType('amp', 'AmpAd');
export const StoryAd = withAdType('story', 'StoryAd');

// Compact native unit for feed/list integration. Same renderer as NativeAd
// with feed-item styling hooks (ad-native-item) for list density.
export const NativeAdItem = forwardRef(({ ad, className = '', ...props }, ref) => (
  <AdComponent
    ref={ref}
    ad={ad ? { ...ad, type: 'native' } : ad}
    className={`ad-native-item ${className}`.trim()}
    {...props}
  />
));
NativeAdItem.displayName = 'NativeAdItem';

function BannerAdContent({ ad, onLoad, onError }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="ad-banner" role="banner" aria-label={ad.title || 'Advertisement'}>
      {ad.imageUrl && !imgError ? (
        <img
          src={ad.imageUrl}
          alt={ad.title || 'Advertisement'}
          onLoad={onLoad}
          onError={(e) => { setImgError(true); onError(e); }}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      ) : ad.videoUrl ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={onLoad}
          onError={onError}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <source src={ad.videoUrl} type="video/mp4" />
        </video>
      ) : (
        <div className="ad-placeholder" style={{ background: ad.accent, color: '#000' }}>
          {ad.title || ad.headline || 'Advertisement'}
        </div>
      )}
      {(ad.headline || ad.cta) && (
        <div className="ad-overlay">
          {ad.headline && <span className="ad-headline">{ad.headline}</span>}
          {ad.cta && <button className="ad-cta">{ad.cta}</button>}
        </div>
      )}
      <AdAttribution ad={ad} />
    </div>
  );
}

function VideoAdContent({ ad, placementId, onLoad, onError }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress(video.currentTime / video.duration);
    };

    const handleEnded = () => {
      setPlaying(false);
      trackViewable(ad.id, placementId, { event: 'complete' });
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [ad, placementId]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const vastData = ad.vastData;
  const mediaFile = vastData?.ads?.[0]?.creatives?.[0]?.mediaFiles?.[0];
  const src = mediaFile?.url || ad.videoUrl;

  return (
    <div className="ad-video" role="region" aria-label={ad.title || 'Video Advertisement'}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        playsInline
        loop
        onLoadedData={onLoad}
        onError={onError}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
      <div className="ad-video-controls">
        <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <div className="ad-progress" style={{ width: `${progress * 100}%` }} />
      </div>
      <AdAttribution ad={ad} />
    </div>
  );
}

function NativeAdContent({ ad, onLoad, onError }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="ad-native" role="article" aria-label={ad.title || 'Sponsored Content'}>
      {ad.imageUrl && !imgError && (
        <img
          src={ad.imageUrl}
          alt={ad.title || ''}
          onLoad={onLoad}
          onError={(e) => { setImgError(true); onError(e); }}
          className="ad-native-image"
          style={{ width: '100%', height: 'auto' }}
        />
      )}
      <div className="ad-native-content">
        {ad.logoUrl && (
          <img src={ad.logoUrl} alt="" className="ad-native-logo" style={{ width: 32, height: 32, borderRadius: 4 }} />
        )}
        <div className="ad-native-text">
          {ad.title && <h4 className="ad-native-title">{ad.title}</h4>}
          {ad.headline && <p className="ad-native-headline">{ad.headline}</p>}
          {ad.snippet && <p className="ad-native-body">{ad.snippet}</p>}
        </div>
        {ad.cta && (
          <button className="ad-native-cta">{ad.cta}</button>
        )}
      </div>
      <AdAttribution ad={ad} />
    </div>
  );
}

function InterstitialAdContent({ ad, onLoad, onError }) {
  const [imgError, setImgError] = useState(false);
  const [showClose, setShowClose] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowClose(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="ad-interstitial" role="dialog" aria-modal="true" aria-label={ad.title || 'Advertisement'}>
      <div className="ad-interstitial-content">
        {showClose && (
          <button className="ad-close" onClick={() => { /* handled by parent */ }} aria-label="Close ad">
            ✕
          </button>
        )}
        {ad.imageUrl && !imgError ? (
          <img
            src={ad.imageUrl}
            alt={ad.title || 'Advertisement'}
            onLoad={onLoad}
            onError={(e) => { setImgError(true); onError(e); }}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        ) : ad.videoUrl ? (
          <video
            autoPlay
            muted
            playsInline
            onLoadedData={onLoad}
            onError={onError}
            style={{ maxWidth: '100%', maxHeight: '70vh' }}
          >
            <source src={ad.videoUrl} type="video/mp4" />
          </video>
        ) : (
          <div className="ad-placeholder" style={{ background: ad.accent, color: '#000', padding: '2rem' }}>
            {ad.title || ad.headline || 'Advertisement'}
          </div>
        )}
        {(ad.headline || ad.cta) && (
          <div className="ad-interstitial-footer">
            {ad.headline && <h3>{ad.headline}</h3>}
            {ad.cta && <button className="ad-cta">{ad.cta}</button>}
          </div>
        )}
      </div>
      <AdAttribution ad={ad} />
    </div>
  );
}

function RewardedAdContent({ ad, onLoad, onError }) {
  const [rewarded, setRewarded] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleComplete = () => {
    setCompleted(true);
    setRewarded(true);
  };

  return (
    <div className="ad-rewarded" role="dialog" aria-modal="true" aria-label={ad.title || 'Rewarded Video'}>
      <div className="ad-rewarded-header">
        <span>Watch to earn reward</span>
        <span className="ad-reward-badge">+{ad.rewardAmount || 'Reward'}</span>
      </div>
      <VideoAdContent ad={ad} onLoad={onLoad} onError={onError} />
      {completed && (
        <div className="ad-reward-granted">
          <span>Reward granted!</span>
          <button onClick={() => { /* close */ }}>Continue</button>
        </div>
      )}
      <AdAttribution ad={ad} />
    </div>
  );
}

function StickyAdContent({ ad, onLoad, onError }) {
  const [imgError, setImgError] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`ad-sticky ${collapsed ? 'collapsed' : ''}`} role="banner" aria-label={ad.title || 'Advertisement'}>
      {!collapsed && (
        <>
          {ad.imageUrl && !imgError ? (
            <img
              src={ad.imageUrl}
              alt={ad.title || 'Advertisement'}
              onLoad={onLoad}
              onError={(e) => { setImgError(true); onError(e); }}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          ) : (
            <div className="ad-placeholder" style={{ background: ad.accent, color: '#000' }}>
              {ad.title || ad.headline || 'Advertisement'}
            </div>
          )}
          <button className="ad-sticky-close" onClick={() => setCollapsed(true)} aria-label="Dismiss">✕</button>
        </>
      )}
      {collapsed && (
        <button className="ad-sticky-restore" onClick={() => setCollapsed(false)} aria-label="Restore ad">
          {ad.title || 'Ad'}
        </button>
      )}
      <AdAttribution ad={ad} />
    </div>
  );
}

// AMP-compatible creative: zero-JS markup (plain anchor + image with fixed
// dimensions, no timers, no observers). The same payload serializes to a real
// <amp-ad> tag via toAmpHTML() for use inside AMP pages, where custom React
// JS is not allowed to run.
function AmpAdContent({ ad, onLoad, onError }) {
  const width = Number(ad.ampWidth) || 320;
  const height = Number(ad.ampHeight) || 100;

  return (
    <div className="ad-amp" role="banner" aria-label={ad.title || 'Advertisement'}>
      <a
        href={ad.linkUrl || '#'}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="ad-amp-link"
        style={{ width, maxWidth: '100%' }}
      >
        {ad.imageUrl ? (
          <img
            src={ad.imageUrl}
            alt={ad.title || 'Advertisement'}
            width={width}
            height={height}
            onLoad={onLoad}
            onError={onError}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        ) : (
          <span className="ad-placeholder" style={{ background: ad.accent, color: '#000', width, height }}>
            {ad.title || ad.headline || 'Advertisement'}
          </span>
        )}
        {(ad.headline || ad.cta) && (
          <span className="ad-amp-caption">
            {ad.headline && <span className="ad-headline">{ad.headline}</span>}
            {ad.cta && <span className="ad-cta">{ad.cta}</span>}
          </span>
        )}
      </a>
      <AdAttribution ad={ad} />
    </div>
  );
}

// Serialize an AMP-type ad to an <amp-ad> HTML string for AMP pages.
// Uses amp-ad with a fixed layout fallback image + click-through; the
// returned string contains no custom JS and is valid inside <body> of an
// AMP document (requires the amp-ad extension script on the page).
export function toAmpHTML(ad, options = {}) {
  const width = Number(ad?.ampWidth) || 320;
  const height = Number(ad?.ampHeight) || 100;
  const slot = ad?.ampSlot || options.slot || ad?.id || 'default';
  const type = options.network || 'doubleclick';
  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const fallback = ad?.imageUrl
    ? `<a href="${esc(ad.linkUrl)}" target="_blank" rel="noopener noreferrer sponsored">` +
      `<amp-img src="${esc(ad.imageUrl)}" width="${width}" height="${height}" ` +
      `alt="${esc(ad.title || 'Advertisement')}" layout="responsive"></amp-img></a>`
    : `<div placeholder>${esc(ad?.title || ad?.headline || 'Advertisement')}</div>`;
  return `<amp-ad width="${width}" height="${height}" type="${esc(type)}" ` +
    `data-slot="${esc(slot)}" layout="responsive">${fallback}</amp-ad>`;
}

// Web Stories format: vertical 9:16 fullscreen story with tap-through pages,
// progress segments and auto-advance. Drives on ad.pages[]; falls back to a
// single page built from the ad's own creative fields.
function StoryAdContent({ ad, placementId, onLoad, onError }) {
  const fallbackPage = {
    imageUrl: ad.imageUrl,
    videoUrl: ad.videoUrl,
    headline: ad.headline,
    title: ad.title,
    cta: ad.cta,
    linkUrl: ad.linkUrl,
  };
  const pages = (Array.isArray(ad.pages) && ad.pages.length > 0 ? ad.pages : [fallbackPage])
    .slice(0, 10);
  const perPageMs = Math.max(1, Number(ad.storyDurationSeconds) || 5) * 1000;
  const [pageIndex, setPageIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef(null);
  const current = pages[pageIndex] || fallbackPage;

  useEffect(() => {
    onLoad?.();
  }, []);

  useEffect(() => {
    setImgError(false);
  }, [pageIndex]);

  useEffect(() => {
    if (paused || pages.length <= 1) return undefined;
    timerRef.current = setTimeout(() => {
      setPageIndex((i) => Math.min(i + 1, pages.length - 1));
    }, perPageMs);
    return () => clearTimeout(timerRef.current);
  }, [pageIndex, paused, pages.length, perPageMs]);

  const go = useCallback((dir) => {
    setPageIndex((i) => Math.min(Math.max(i + dir, 0), pages.length - 1));
  }, [pages.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const openLink = (url) => {
    const href = url || current.linkUrl || ad.linkUrl;
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="ad-story"
      role="region"
      aria-roledescription="advertisement story"
      aria-label={ad.title || 'Sponsored story'}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="ad-story-progress" aria-hidden="true">
        {pages.map((_, i) => (
          <span
            key={i}
            className={`ad-story-segment ${i < pageIndex ? 'done' : ''} ${i === pageIndex ? 'active' : ''}`}
          >
            {i === pageIndex && !paused && pages.length > 1 && (
              <span
                className="ad-story-segment-fill"
                style={{ animationDuration: `${perPageMs}ms` }}
              />
            )}
          </span>
        ))}
      </div>
      <div className="ad-story-media">
        {current.videoUrl ? (
          <video
            key={pageIndex}
            src={current.videoUrl}
            autoPlay
            muted
            playsInline
            loop
            onError={onError}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : current.imageUrl && !imgError ? (
          <img
            key={pageIndex}
            src={current.imageUrl}
            alt={current.title || ad.title || 'Sponsored story page'}
            onError={() => { setImgError(true); onError?.(); }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="ad-placeholder" style={{ background: ad.accent, color: '#000', width: '100%', height: '100%' }}>
            {current.title || current.headline || 'Advertisement'}
          </div>
        )}
        <div className="ad-story-shade" aria-hidden="true" />
      </div>
      <button className="ad-story-tap left" onClick={() => go(-1)} aria-label="Previous story page" />
      <button className="ad-story-tap right" onClick={() => go(1)} aria-label="Next story page" />
      <div className="ad-story-copy">
        {(current.title || ad.title) && <h4 className="ad-story-title">{current.title || ad.title}</h4>}
        {current.headline && <p className="ad-story-headline">{current.headline}</p>}
        {(current.cta || ad.cta) && (
          <button className="ad-cta" onClick={(e) => { e.stopPropagation(); openLink(current.linkUrl); }}>
            {current.cta || ad.cta}
          </button>
        )}
      </div>
      <AdAttribution ad={ad} />
    </div>
  );
}

function AdAttribution({ ad }) {
  return (
    <div className="ad-attribution" aria-hidden="true">
      <span>Ad</span>
      {ad.provider && <span>• {ad.provider}</span>}
    </div>
  );
}

export function AdSlot({
  placementId,
  className = '',
  style,
  fallback,
  children,
  ...props
}) {
  const { service, initialized } = useAds();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!initialized || !placementId) return;

    const fetchAd = async () => {
      setLoading(true);
      const nextAd = service.getNextAd(placementId, {
        userId: props.userId,
        sessionId: props.sessionId,
        page: { url: window.location.href },
        geo: props.geo,
        device: props.device,
      });
      setAd(nextAd);
      setLoading(false);
    };

    fetchAd();

    if (props.refreshInterval) {
      const interval = setInterval(fetchAd, props.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [initialized, placementId, service, props.refreshInterval, props.userId, props.sessionId, props.geo, props.device]);

  if (loading) {
    return fallback || <AdSkeleton />;
  }

  if (!ad) {
    return children || null;
  }

  return (
    <AdComponent
      ad={ad}
      placementId={placementId}
      className={className}
      style={style}
      {...props}
    />
  );
}

export function AdSkeleton({ className = '', style }) {
  return (
    <div className={`ad-skeleton ${className}`} style={style} aria-hidden="true">
      <div className="skeleton-loader">
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
      </div>
    </div>
  );
}

export function AdErrorBoundary({ children, fallback }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.target?.closest?.('.ad-component')) {
        setError(e.error);
      }
    };
    window.addEventListener('error', handler, true);
    return () => window.removeEventListener('error', handler, true);
  }, []);

  if (error) {
    return fallback || <div className="ad-error-boundary">Ad failed to load</div>;
  }

  return children;
}

export { getAdsService, initAdsService, initializeAds } from './service.js';