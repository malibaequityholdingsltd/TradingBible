// Browser-safe Bech32 verify (BIP-173) for native `tbc1…` addresses.
// Authoritative check also runs server-side; this gates the form early.

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function hrpExpand(hrp) {
  const out = [];
  for (const c of hrp) out.push(c.charCodeAt(0) >> 5);
  out.push(0);
  for (const c of hrp) out.push(c.charCodeAt(0) & 31);
  return out;
}

function polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i += 1) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function convertBits(data, fromBits, toBits, pad) {
  let acc = 0;
  let bits = 0;
  const out = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    if (value < 0 || (value >> fromBits) !== 0) return null;
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      out.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) out.push((acc << (toBits - bits)) & maxv);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    return null;
  }
  return out;
}

export function isTbcAddress(addr) {
  if (typeof addr !== 'string') return false;
  const s = addr.trim();
  if (s.length < 8 || s.length > 90) return false;
  if (s !== s.toLowerCase() && s !== s.toUpperCase()) return false;
  const lower = s.toLowerCase();
  const pos = lower.lastIndexOf('1');
  if (pos < 1 || pos + 7 > lower.length) return false;
  const hrp = lower.slice(0, pos);
  if (hrp !== 'tbc') return false;
  const data = [];
  for (const c of lower.slice(pos + 1)) {
    const v = CHARSET.indexOf(c);
    if (v === -1) return false;
    data.push(v);
  }
  if (polymod([...hrpExpand(hrp), ...data]) !== 1) return false;
  const payload = convertBits(data.slice(0, -6), 5, 8, false);
  if (!payload) return false;
  return payload.length === 20 || payload.length === 32;
}
