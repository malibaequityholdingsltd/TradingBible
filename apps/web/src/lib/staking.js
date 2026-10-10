// Staking data layer — testnet-preview adapter with a live-chain seam.
// Parameters mirror the chain blueprint (50 active set, 21-day unbonding,
// 20% max commission, 10,000 TBC min self-bond, 8% subsidy cap).
// Positions persist locally as a preview until the network is live; then
// swap the adapter functions below for RPC calls with the same shapes.

export const STAKING_PARAMS = {
  minSelfBond: 10000,
  maxCommission: 0.20,
  commissionChangeMaxPerDay: 0.01,
  unbondingDays: 21,
  activeSetCap: 50,
  blockTimeSec: 3,
  slashDoubleSign: 0.05,
  slashDowntime: 0.0001,
  subsidyCapApr: 0.08,
};

// Illustrative testnet validator set. APRs are scenario figures capped at
// the 8% subsidy envelope — not promised returns.
export const MOCK_VALIDATORS = [
  { id: 'tbval-01', name: 'Genesis One', votingPower: 1840000, commission: 0.08, uptime: 99.9, apr: 7.4, status: 'active', selfBond: 120000 },
  { id: 'tbval-02', name: 'Meridian Stake', votingPower: 1520000, commission: 0.10, uptime: 99.7, apr: 7.1, status: 'active', selfBond: 85000 },
  { id: 'tbval-03', name: 'Ironclad Nodes', votingPower: 1210000, commission: 0.05, uptime: 99.9, apr: 7.6, status: 'active', selfBond: 200000 },
  { id: 'tbval-04', name: 'Copper Canyon', votingPower: 640000, commission: 0.12, uptime: 98.4, apr: 6.8, status: 'active', selfBond: 42000 },
  { id: 'tbval-05', name: 'Northline Ops', votingPower: 310000, commission: 0.15, uptime: 97.1, apr: 6.2, status: 'active', selfBond: 25000 },
  { id: 'tbval-06', name: 'Harbor Light', votingPower: 95000, commission: 0.09, uptime: 95.8, apr: 5.9, status: 'candidate', selfBond: 12000 },
];

const LS_KEY = 'tb-staking-preview-v1';

function loadPositions() {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { delegations: {}, unbonding: [], rewards: 0, lastAccrue: Date.now() };
}

function savePositions(p) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// Accrue illustrative rewards for elapsed time since last visit.
function accrue(p) {
  const now = Date.now();
  const elapsedDays = Math.max(0, (now - (p.lastAccrue || now)) / 86400000);
  if (elapsedDays > 0) {
    for (const [vid, amt] of Object.entries(p.delegations || {})) {
      const v = MOCK_VALIDATORS.find((x) => x.id === vid);
      const apr = v ? v.apr / 100 : STAKING_PARAMS.subsidyCapApr;
      p.rewards = Math.round(((p.rewards || 0) + Number(amt) * apr * (elapsedDays / 365)) * 100) / 100;
    }
  }
  p.lastAccrue = now;
  return p;
}

export function getValidators() {
  return MOCK_VALIDATORS.map((v) => ({ ...v }));
}

export function getStakingAccount() {
  const p = accrue(loadPositions());
  savePositions(p);
  const bonded = Object.values(p.delegations || {}).reduce((s, n) => s + (Number(n) || 0), 0);
  return {
    bonded: Math.round(bonded * 100) / 100,
    rewards: Math.round((p.rewards || 0) * 100) / 100,
    delegations: { ...(p.delegations || {}) },
    unbonding: [...(p.unbonding || [])].sort((a, b) => a.releaseAt - b.releaseAt),
    source: 'testnet-preview',
  };
}

export function delegate(validatorId, amount) {
  const n = Math.round((Number(amount) || 0) * 100) / 100;
  if (!(n > 0)) throw new Error('Enter an amount above zero.');
  const v = MOCK_VALIDATORS.find((x) => x.id === validatorId);
  if (!v || v.status !== 'active') throw new Error('Validator is not accepting delegations.');
  const p = accrue(loadPositions());
  p.delegations[validatorId] = Math.round(((Number(p.delegations[validatorId]) || 0) + n) * 100) / 100;
  savePositions(p);
  return getStakingAccount();
}

export function undelegate(validatorId, amount) {
  const n = Math.round((Number(amount) || 0) * 100) / 100;
  if (!(n > 0)) throw new Error('Enter an amount above zero.');
  const p = accrue(loadPositions());
  const cur = Number(p.delegations[validatorId]) || 0;
  if (cur < n) throw new Error('Amount exceeds your delegation.');
  p.delegations[validatorId] = Math.round((cur - n) * 100) / 100;
  if (p.delegations[validatorId] <= 0) delete p.delegations[validatorId];
  p.unbonding.push({
    id: `${validatorId}-${Date.now()}`,
    validatorId,
    amount: n,
    releaseAt: Date.now() + STAKING_PARAMS.unbondingDays * 86400000,
  });
  savePositions(p);
  return getStakingAccount();
}

export function unbondingCountdown(releaseAt, now = Date.now()) {
  const ms = Math.max(0, releaseAt - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { ms, text: ms <= 0 ? 'Released' : `${d}d ${h}h ${m}m` };
}
