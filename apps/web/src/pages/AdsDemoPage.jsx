import React, { useState, useEffect } from 'react';
import { AdProvider, AdSlot, AdSkeleton, AdComponent, AdErrorBoundary, BannerAd, NativeAdItem, AmpAd, StoryAd, toAmpHTML } from '@/lib/ads/components.jsx';
import { getAdsService, initializeAds } from '@/lib/ads/service.js';
import { createPlacementId, AD_TYPES, AD_PLACEMENTS, AD_SIZES } from '@/lib/ads/types.js';

const mockAds = [
  {
    id: 'ad_1',
    key: 'ad:banner-demo',
    type: AD_TYPES.BANNER,
    provider: 'brand',
    title: 'TradingBible Pro',
    headline: 'Upgrade your trading with SI-powered analytics',
    imageUrl: 'https://picsum.photos/seed/tradingbible-pro/728/90',
    linkUrl: 'https://tradingbible.app/pricing',
    cta: 'Get Pro',
    accent: '#d4af37',
    weight: 10,
    enabled: true,
    targeting: [],
    placementIds: ['ph_header', 'ph_sidebar'],
  },
  {
    id: 'ad_2',
    key: 'ad:video-demo',
    type: AD_TYPES.VIDEO,
    provider: 'brand',
    title: 'SI Coach Demo',
    headline: 'Your personal trading coach, awake 24/7',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    linkUrl: 'https://tradingbible.app/coach',
    cta: 'Try Coach',
    accent: '#38bdf8',
    durationSeconds: 30,
    weight: 8,
    enabled: true,
    targeting: [],
    placementIds: ['ph_video_pre', 'ph_in_article'],
  },
  {
    id: 'ad_3',
    key: 'ad:native-demo',
    type: AD_TYPES.NATIVE,
    provider: 'partner',
    title: 'Funded Trader Program',
    headline: 'Get funded up to $200K — keep 90% of profits',
    imageUrl: 'https://picsum.photos/seed/funded-trader/600/400',
    logoUrl: 'https://picsum.photos/seed/prop-firm/64/64',
    snippet: 'Join thousands of traders who passed our evaluation and now trade with firm capital. No risk to your own money.',
    linkUrl: 'https://tradingbible.app/prop-firms',
    cta: 'Apply Now',
    accent: '#10b981',
    weight: 6,
    enabled: true,
    targeting: [],
    placementIds: ['ph_in_feed', 'ph_sidebar'],
  },
  {
    id: 'ad_4',
    key: 'ad:interstitial-demo',
    type: AD_TYPES.INTERSTITIAL,
    provider: 'brand',
    title: 'Black Friday Sale',
    headline: '50% off all plans — this week only',
    imageUrl: 'https://picsum.photos/seed/black-friday/800/600',
    linkUrl: 'https://tradingbible.app/pricing?promo=bf50',
    cta: 'Claim Discount',
    accent: '#ef4444',
    weight: 5,
    enabled: true,
    targeting: [],
    placementIds: ['ph_interstitial'],
  },
  {
    id: 'ad_5',
    key: 'ad:rewarded-demo',
    type: AD_TYPES.REWARDED,
    provider: 'partner',
    title: 'Earn Wallet Credit',
    headline: 'Watch 30s video — get $5 trading credit',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    linkUrl: 'https://tradingbible.app/wallet',
    cta: 'Claim Reward',
    accent: '#f59e0b',
    rewardAmount: '$5',
    durationSeconds: 30,
    weight: 4,
    enabled: true,
    targeting: [],
    placementIds: ['ph_rewarded'],
  },
  {
    id: 'ad_6',
    key: 'ad:sticky-demo',
    type: AD_TYPES.STICKY,
    provider: 'brand',
    title: 'Live Signals',
    headline: 'BTC Long • Entry 67,240 • Target 68,500',
    imageUrl: 'https://picsum.photos/seed/live-signals/728/90',
    linkUrl: 'https://tradingbible.app/signals',
    cta: 'View Signal',
    accent: '#8b5cf6',
    weight: 7,
    enabled: true,
    targeting: [],
    placementIds: ['ph_sticky_bottom'],
  },
  {
    id: 'ad_7',
    key: 'ad:amp-demo',
    type: AD_TYPES.AMP,
    provider: 'partner',
    title: 'Broker Bonus',
    headline: '100% deposit bonus up to $1,000',
    imageUrl: 'https://picsum.photos/seed/broker-bonus/320/100',
    linkUrl: 'https://tradingbible.app/brokers',
    cta: 'Claim',
    accent: '#38bdf8',
    ampWidth: 320,
    ampHeight: 100,
    ampSlot: 'demo-amp-banner',
    weight: 5,
    enabled: true,
    targeting: [],
    placementIds: ['ph_amp'],
  },
  {
    id: 'ad_8',
    key: 'ad:story-demo',
    type: AD_TYPES.STORY,
    provider: 'brand',
    title: 'From $500 to Funded',
    headline: 'Swipe through the 3-step playbook',
    imageUrl: 'https://picsum.photos/seed/story-cover/360/640',
    linkUrl: 'https://tradingbible.app/academy',
    cta: 'Start Free',
    accent: '#d4af37',
    storyDurationSeconds: 5,
    pages: [
      {
        imageUrl: 'https://picsum.photos/seed/story-1/360/640',
        title: 'Step 1 — Journal',
        headline: 'Log every trade with screenshots and emotions.',
        cta: 'Learn How',
        linkUrl: 'https://tradingbible.app/guides',
      },
      {
        imageUrl: 'https://picsum.photos/seed/story-2/360/640',
        title: 'Step 2 — Review',
        headline: 'SI Coach finds the pattern costing you money.',
        cta: 'Meet the Coach',
        linkUrl: 'https://tradingbible.app/coach',
      },
      {
        imageUrl: 'https://picsum.photos/seed/story-3/360/640',
        title: 'Step 3 — Get Funded',
        headline: 'Pass evaluation with proven risk rules.',
        cta: 'Start Free',
        linkUrl: 'https://tradingbible.app/pricing',
      },
    ],
    weight: 5,
    enabled: true,
    targeting: [],
    placementIds: ['ph_story'],
  },
];

function MockAdsService() {
  const originalFetch = window.fetch;
  
  useEffect(() => {
    window.fetch = async (url, options) => {
      if (url.includes('/api/ads') && !url.includes('/track')) {
        if (url.includes('/placements')) {
          return new Response(JSON.stringify({ 
            placements: [
              { id: 'ph_header', name: 'Header Banner', type: AD_PLACEMENTS.HEADER },
              { id: 'ph_sidebar', name: 'Sidebar', type: AD_PLACEMENTS.SIDEBAR },
              { id: 'ph_in_feed', name: 'In Feed', type: AD_PLACEMENTS.IN_FEED },
              { id: 'ph_in_article', name: 'In Article', type: AD_PLACEMENTS.IN_ARTICLE },
              { id: 'ph_video_pre', name: 'Pre-roll Video', type: AD_PLACEMENTS.VIDEO_PRE_ROLL },
              { id: 'ph_interstitial', name: 'Interstitial', type: AD_PLACEMENTS.MODAL },
              { id: 'ph_rewarded', name: 'Rewarded Video', type: AD_PLACEMENTS.REWARDED_VIDEO },
              { id: 'ph_sticky_bottom', name: 'Sticky Bottom', type: AD_PLACEMENTS.STICKY_BOTTOM },
              { id: 'ph_amp', name: 'AMP Banner', type: AD_PLACEMENTS.AMP },
              { id: 'ph_story', name: 'Story Fullscreen', type: AD_PLACEMENTS.STORY },
            ] 
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ 
          settings: { rotationSeconds: 10, headerText: 'Demo Ads', footerText: 'Demo', advertiserEmail: 'demo@tradingbible.app' },
          ads: mockAds 
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/track')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return originalFetch(url, options);
    };
    
    return () => { window.fetch = originalFetch; };
  }, []);
  
  return null;
}

function DemoPlacement({ placementId, title, description, children }) {
  return (
    <div className="demo-placement">
      <div className="demo-placement-header">
        <h3 className="font-semibold text-[#f0ecdd]">{title}</h3>
        <span className="text-xs text-[#8a8577] px-2 py-0.5 rounded bg-white/5">{placementId}</span>
      </div>
      <p className="text-sm text-[#8a8577] mb-3">{description}</p>
      <div className="demo-placement-content">
        {children}
      </div>
    </div>
  );
}

function AdsDemoContent() {
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewarded, setShowRewarded] = useState(false);
  
  const { service } = React.useContext(
    React.createContext(null)
  ) || { service: getAdsService() };
  
  return (
    <div className="demo-page max-w-6xl mx-auto p-6 space-y-8">
      <MockAdsService />
      
      <div className="demo-header">
        <h1 className="font-display text-3xl md:text-4xl gold-text mb-2">Ads System Demo</h1>
        <p className="text-[#8a8577]">Interactive showcase of all ad formats, targeting, rotation, and tracking</p>
      </div>
      
      <AdErrorBoundary>
        <div className="grid gap-6 md:grid-cols-2">
          <DemoPlacement
            placementId="ph_header"
            title="Header Banner (Leaderboard)"
            description="Standard 728×90 banner at top of page. Rotates every 10s."
          >
            <AdSlot placementId="ph_header" fallback={<AdSkeleton className="h-24" />} />
          </DemoPlacement>
          
          <DemoPlacement
            placementId="ph_sidebar"
            title="Sidebar (Skyscraper)"
            description="160×600 or 300×600 vertical banner. Sticky on scroll."
          >
            <div className="h-96">
              <AdSlot placementId="ph_sidebar" fallback={<AdSkeleton className="h-96" />} />
            </div>
          </DemoPlacement>
          
          <DemoPlacement
            placementId="ph_in_feed"
            title="In-Feed Native Ad"
            description="Blends with content feed. Image + headline + body + CTA."
          >
            <AdSlot placementId="ph_in_feed" fallback={<AdSkeleton className="h-48" />} />
          </DemoPlacement>
          
          <DemoPlacement
            placementId="ph_in_article"
            title="In-Article Video"
            description="Auto-play muted video between paragraphs. Expands on click."
          >
            <AdSlot placementId="ph_in_article" fallback={<AdSkeleton className="h-56" />} />
          </DemoPlacement>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <DemoPlacement
            placementId="ph_video_pre"
            title="Pre-Roll Video Ad"
            description="VAST/VMAP compliant. Plays before main content. Quartile tracking."
          >
            <AdSlot placementId="ph_video_pre" fallback={<AdSkeleton className="h-56" />} />
          </DemoPlacement>
          
          <DemoPlacement
            placementId="ph_sticky_bottom"
            title="Sticky Bottom Banner"
            description="Anchored to viewport bottom. Collapsible. High viewability."
          >
            <AdSlot placementId="ph_sticky_bottom" fallback={<AdSkeleton className="h-24" />} />
          </DemoPlacement>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <DemoPlacement
            placementId="ph_amp"
            title="AMP-Compatible Banner"
            description="Zero-JS static creative with fixed dimensions. Serializes to <amp-ad> for AMP pages (markup preview below)."
          >
            <AdSlot placementId="ph_amp" fallback={<AdSkeleton className="h-24" />} />
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-[#8a8577] hover:text-[#d4af37]">View &lt;amp-ad&gt; markup</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-[#c9c4b4]">
                {toAmpHTML(mockAds.find(a => a.type === AD_TYPES.AMP))}
              </pre>
            </details>
          </DemoPlacement>

          <DemoPlacement
            placementId="ph_story"
            title="Web Story Ad (9:16)"
            description="Tap-through fullscreen story with progress segments and auto-advance. Arrow keys work too."
          >
            <AdSlot placementId="ph_story" fallback={<AdSkeleton className="h-96" />} />
          </DemoPlacement>
        </div>
        
        <div className="space-y-4">
          <h2 className="font-semibold text-xl gold-text">Interactive Modals</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowInterstitial(true)}
              className="btn-glass px-4 py-2 rounded-xl text-sm"
            >
              Show Interstitial
            </button>
            <button 
              onClick={() => setShowRewarded(true)}
              className="btn-glass px-4 py-2 rounded-xl text-sm"
            >
              Show Rewarded Video
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="font-semibold text-xl gold-text">Manual Ad Components</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {mockAds.filter(a => ![AD_TYPES.AMP, AD_TYPES.STORY].includes(a.type)).map(ad => (
              <AdComponent
                key={ad.id}
                ad={ad}
                placementId="manual"
                className="h-48"
              />
            ))}
          </div>
          <h3 className="font-medium text-sm text-[#8a8577] pt-2">Named format exports (BannerAd, NativeAdItem, AmpAd, StoryAd)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <BannerAd ad={mockAds[0]} placementId="manual-named" />
            <NativeAdItem ad={mockAds[2]} placementId="manual-named" />
            <AmpAd ad={mockAds.find(a => a.type === AD_TYPES.AMP)} placementId="manual-named" />
            <StoryAd ad={mockAds.find(a => a.type === AD_TYPES.STORY)} placementId="manual-named" />
          </div>
        </div>
        
        <div className="space-y-4 pt-6 border-t border-white/10">
          <h2 className="font-semibold text-xl gold-text">Ad Types Reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#8a8577] border-b border-white/10">
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Placement</th>
                  <th className="pb-2 pr-4 font-medium">Sizes</th>
                  <th className="pb-2 font-medium">Use Case</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(AD_TYPES).map(([key, value]) => (
                  <tr key={value} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-mono text-[#d4af37]">{value}</td>
                    <td className="py-2 pr-4">{Object.entries(AD_PLACEMENTS).find(([,v]) => v === value)?.[0] || '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {Object.entries(AD_SIZES)
                        .filter(([,v]) => v.name.toLowerCase().includes(value.replace('_', ' ')))
                        .map(([,v]) => `${v.width}×${v.height}`)
                        .join(', ') || 'Responsive'}
                    </td>
                    <td className="py-2 text-[#8a8577]">
                      {({
                        banner: 'Display advertising, brand awareness',
                        video: 'Pre/mid/post-roll, VAST/VMAP',
                        native: 'In-feed, content recommendation',
                        interstitial: 'Full-screen between page loads',
                        rewarded: 'User opts in for reward',
                        sticky: 'Persistent bottom/top banner',
                        app_open: 'App launch screen',
                        amp: 'Zero-JS creative for AMP pages (<amp-ad>)',
                        story: 'Vertical 9:16 tap-through story',
                      })[value] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdErrorBoundary>
      
      {showInterstitial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowInterstitial(false)}>
          <AdComponent
            ad={mockAds.find(a => a.type === AD_TYPES.INTERSTITIAL)}
            placementId="ph_interstitial"
            onClick={() => setShowInterstitial(false)}
          />
        </div>
      )}
      
      {showRewarded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowRewarded(false)}>
          <div onClick={e => e.stopPropagation()}>
            <AdComponent
              ad={mockAds.find(a => a.type === AD_TYPES.REWARDED)}
              placementId="ph_rewarded"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdsDemoPage() {
  return (
    <AdProvider options={{ apiUrl: '/api/ads' }}>
      <AdsDemoContent />
    </AdProvider>
  );
}