// TradingBible Terminal Premium — risk engine (pure math, no execution).
// Computes position size, R:R, projected P&L and margin impact BEFORE any
// order is submitted. Execution itself stays with the broker/prop account.
export function calcRisk({ balance, riskPct, entry, stop, target, contractSize = 1 }) {
  const b = Number(balance) || 0;
  const r = Math.min(100, Math.max(0, Number(riskPct) || 0));
  const e = Number(entry) || 0;
  const s = Number(stop) || 0;
  const t = Number(target) || 0;
  const riskMoney = (b * r) / 100;
  const slDist = Math.abs(e - s);
  const tpDist = Math.abs(t - e);
  const qty = slDist > 0 ? riskMoney / (slDist * (Number(contractSize) || 1)) : 0;
  const rr = slDist > 0 && tpDist > 0 ? tpDist / slDist : 0;
  const maxLoss = qty * slDist * (Number(contractSize) || 1);
  const maxGain = qty * tpDist * (Number(contractSize) || 1);
  const r2 = (v) => Math.round(v * 100) / 100;
  return { riskMoney: r2(riskMoney), slDist: r2(slDist), tpDist: r2(tpDist), qty: r2(qty), rr: r2(rr), maxLoss: r2(maxLoss), maxGain: r2(maxGain) };
}

export function checkAccountRules({ riskPct, qty, balance, rules = {} }) {
  const warnings = [];
  if ((Number(riskPct) || 0) > (Number(rules.maxRiskPct) || 2)) warnings.push(`Risk ${riskPct}% exceeds account cap ${rules.maxRiskPct || 2}%`);
  if ((Number(qty) || 0) > (Number(rules.maxQty) || Infinity)) warnings.push(`Size ${qty} exceeds account max ${rules.maxQty}`);
  if ((Number(balance) || 0) <= 0) warnings.push('No balance on this account — connect it first.');
  return warnings;
}
