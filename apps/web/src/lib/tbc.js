import { useCallback, useEffect, useState } from 'react';
import { API_SERVER_URL } from './apiServerClient';
import { brandLogo } from './brand';

// TradingBible Coin registry (public). The official TBC symbol is the brand
// image logo — one mark for the brand and the coin.
export const TBC_LOGO_URL = brandLogo.url;
export const TBC_SUPPLY = '100,000,000';
export const TBC_ALLOCATION = [
  { label: 'Community & Ecosystem', pct: 25 },
  { label: 'Validator & Staking Reserve', pct: 30 },
  { label: 'Treasury', pct: 15 },
  { label: 'Team & Contributors (vested)', pct: 15 },
  { label: 'Strategic Funding', pct: 10 },
  { label: 'Liquidity & Integrations', pct: 5 },
];
export const TBC_ROADMAP = [
  { phase: 'Blueprint', desc: '100M cap, allocation, staking model, $50K testnet plan.', state: 'done' },
  { phase: 'Legal & Regulatory Review', desc: 'Classification, permissions and disclosures before any sale.', state: 'upcoming' },
  { phase: 'Prototype Chain (tbcd)', desc: 'Cosmos SDK + CometBFT + Cosmos EVM baseline, native TBC, no routine minting.', state: 'upcoming' },
  { phase: 'Developer Testnet ($50K)', desc: 'Private network, reproduced demos, accepted work packages.', state: 'upcoming' },
  { phase: 'Independent Security Audit', desc: 'Chain, contracts and economics reviewed; findings fixed and retested.', state: 'upcoming' },
  { phase: 'Public Testnet', desc: 'External operators, reviewed economics, 90-day observation.', state: 'upcoming' },
  { phase: 'Mainnet (gated)', desc: 'All security, legal, operating and disclosure gates pass.', state: 'upcoming' },
];

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
