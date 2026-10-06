export const AD_TYPES = {
  BANNER: 'banner',
  VIDEO: 'video',
  NATIVE: 'native',
  INTERSTITIAL: 'interstitial',
  REWARDED: 'rewarded',
  STICKY: 'sticky',
  APP_OPEN: 'app_open',
  AMP: 'amp',
  STORY: 'story',
};

export const AD_SIZES = {
  LEADERBOARD: { width: 728, height: 90, name: 'Leaderboard' },
  LARGE_LEADERBOARD: { width: 970, height: 90, name: 'Large Leaderboard' },
  SKYSCRAPER: { width: 160, height: 600, name: 'Skyscraper' },
  WIDE_SKYSCRAPER: { width: 300, height: 600, name: 'Wide Skyscraper' },
  MEDIUM_RECTANGLE: { width: 300, height: 250, name: 'Medium Rectangle' },
  LARGE_RECTANGLE: { width: 336, height: 280, name: 'Large Rectangle' },
  MOBILE_LEADERBOARD: { width: 320, height: 50, name: 'Mobile Leaderboard' },
  MOBILE_BANNER: { width: 320, height: 100, name: 'Mobile Banner' },
  FLUID: { width: 'auto', height: 'auto', name: 'Fluid/Responsive' },
  INTERSTITIAL: { width: '100%', height: '100%', name: 'Full Screen' },
  REWARDED: { width: '100%', height: '100%', name: 'Rewarded Video' },
  NATIVE_FEED: { width: '100%', height: 'auto', name: 'Native Feed' },
  STICKY_BOTTOM: { width: '100%', height: 90, name: 'Sticky Bottom' },
  STICKY_TOP: { width: '100%', height: 90, name: 'Sticky Top' },
  AMP_BANNER: { width: 320, height: 100, name: 'AMP Banner (fixed layout)' },
  AMP_LEADERBOARD: { width: 728, height: 90, name: 'AMP Leaderboard (fixed layout)' },
  STORY_FULLSCREEN: { width: 360, height: 640, name: 'Story Fullscreen (9:16)' },
};

export const AD_PLACEMENTS = {
  HEADER: 'header',
  FOOTER: 'footer',
  SIDEBAR: 'sidebar',
  IN_FEED: 'in_feed',
  IN_ARTICLE: 'in_article',
  BETWEEN_CONTENT: 'between_content',
  MODAL: 'modal',
  FULL_SCREEN: 'full_screen',
  APP_OPEN: 'app_open',
  STICKY_BOTTOM: 'sticky_bottom',
  STICKY_TOP: 'sticky_top',
  VIDEO_PRE_ROLL: 'video_pre_roll',
  VIDEO_MID_ROLL: 'video_mid_roll',
  VIDEO_POST_ROLL: 'video_post_roll',
  REWARDED_VIDEO: 'rewarded_video',
  AMP: 'amp',
  STORY: 'story',
};

export const TARGETING_TYPES = {
  USER_SEGMENT: 'user_segment',
  GEO: 'geo',
  DEVICE: 'device',
  BROWSER: 'browser',
  TIME: 'time',
  RETARGETING: 'retargeting',
  FREQUENCY: 'frequency',
  CONTEXTUAL: 'contextual',
};

export const ROTATION_ALGORITHMS = {
  WEIGHTED: 'weighted',
  ROUND_ROBIN: 'round_robin',
  PRIORITY: 'priority',
  EVEN_PACING: 'even_pacing',
  OPTIMIZE_CTR: 'optimize_ctr',
  OPTIMIZE_REVENUE: 'optimize_revenue',
};

export const FREQUENCY_CAP_TYPES = {
  IMPRESSIONS_PER_HOUR: 'impressions_per_hour',
  IMPRESSIONS_PER_DAY: 'impressions_per_day',
  IMPRESSIONS_PER_WEEK: 'impressions_per_week',
  IMPRESSIONS_PER_SESSION: 'impressions_per_session',
  IMPRESSIONS_PER_USER: 'impressions_per_user',
  IMPRESSIONS_GLOBAL: 'impressions_global',
};

export const VIDEO_EVENTS = {
  START: 'start',
  FIRST_QUARTILE: 'first_quartile',
  MIDPOINT: 'midpoint',
  THIRD_QUARTILE: 'third_quartile',
  COMPLETE: 'complete',
  PAUSE: 'pause',
  RESUME: 'resume',
  MUTE: 'mute',
  UNMUTE: 'unmute',
  FULLSCREEN: 'fullscreen',
  ERROR: 'error',
  SKIP: 'skip',
};

export const AD_EVENTS = {
  IMPRESSION: 'impression',
  CLICK: 'click',
  VIEWABLE: 'viewable',
  CONVERSION: 'conversion',
  CLOSE: 'close',
  DISMISS: 'dismiss',
  REWARD_GRANTED: 'reward_granted',
  LOAD_START: 'load_start',
  LOAD_COMPLETE: 'load_complete',
  LOAD_ERROR: 'load_error',
};

export const EXPERIMENT_STATUS = {
  DRAFT: 'draft',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

export const EXPERIMENT_ASSIGNMENT_METHODS = {
  HASH_USER_ID: 'hash_user_id',
  HASH_SESSION_ID: 'hash_session_id',
  RANDOM: 'random',
  CONDITIONAL: 'conditional',
};

export function createAdId() {
  return `ad_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function createExperimentId() {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function createPlacementId() {
  return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function createZoneId() {
  return `zone_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}