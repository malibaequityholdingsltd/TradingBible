import { useCallback, useEffect, useState } from 'react';
import { API_SERVER_URL } from './apiServerClient';
import { brandLogo } from './brand';

// TradingBible Coin registry (public). The official TBC symbol is the brand
// image logo — one mark for the brand and the coin.
// The corrected October 2026 allocation and 8-phase roadmap live in
// tbcEcosystem.js so the public site, app and admin console cannot drift.
export { TBC_ALLOCATION, TBC_ROADMAP } from './tbcEcosystem';
export const TBC_LOGO_URL = brandLogo.url;
export const TBC_SUPPLY = '100,000,000';

export function useTbc() {
  const [tbc, setTbc] = useState({ ticker: 'TBC', deployed: false, contracts: {}, tracking: false, swaps: false, payments: false, onramp: false });
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc`);
      if (res.ok) setTbc(await res.json());
    } catch { /* display-only defaults */ }
    finally { setLoaded(true); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { tbc, loaded, reload: load };
}
