import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { brandLogo } from '@/lib/brand';

/**
 * US driver's-license style Employee ID card — print-ready.
 *
 * Physical size: CR80 (3.375in × 2.125in — same as a US driver's license).
 * Design canvas: 648×408 px = 2× CR80 at 96dpi, so print at scale 0.5 for
 * exact size (324px = 3.375in, 204px = 2.125in).
 *
 * Both sides are rendered on screen (front + back) and print via the
 * ID-cards admin page (print portal hides the app chrome).
 */

export const CARD_W = 648; // 2× CR80 @ 96dpi
export const CARD_H = 408;

const INK = '#17171f';
const MUTED = '#8c8678';
const GOLD = '#b8962e';
const GOLD_LIGHT = '#e6d28a';
const CREAM = '#f7f2e5';
const HEADER_BG = 'linear-gradient(100deg, #0b0b13 0%, #1c1c2b 55%, #0f0f18 100%)';
const FONT = '"Inter", "Helvetica Neue", Arial, system-ui, sans-serif';
const DISPLAY = '"Sora", "Archivo Black", "Arial Black", sans-serif';
const MONO = '"JetBrains Mono", "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';
const SCRIPT = '"Snell Roundhand", "Segoe Script", "Brush Script MT", cursive';

/* ─── helpers (exported — reused by the ID-cards page + bio page) ─── */

export function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function expiryDate(staff) {
  const base = staff?.hiredAt || staff?.startDate;
  const d = base ? new Date(base) : new Date();
  if (Number.isNaN(d.getTime())) return '—';
  d.setFullYear(d.getFullYear() + 4);
  return fmtDate(d);
}

export function employeeNo(staff) {
  if (staff?.employeeId) return staff.employeeId;
  const clean = String(staff?.id || staff?.appId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const body = (clean + '000000000').slice(0, 9);
  return `TB-${body.slice(0, 3)}-${body.slice(3, 6)}-${body.slice(6, 9)}`;
}

export function companyEmail(staff) {
  if (staff?.workEmail) return staff.workEmail;
  const parts = String(staff?.name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'team@tradingbible.app';
  const first = parts[0].replace(/[^a-z0-9]/g, '');
  const last = (parts.length > 1 ? parts[parts.length - 1] : '').replace(/[^a-z0-9]/g, '');
  return `${first || 'team'}${last ? `.${last}` : ''}@tradingbible.app`;
}

export function nameParts(name) {
  const parts = String(name || 'Team Member').trim().split(/\s+/);
  const first = parts[0] || 'Team';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
  const initials = `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}`;
  return { first, middle, last, initials };
}

/* Code 39 — real, scannable barcode (encodes the employee number). */
const CODE39 = {
  0: '000110100', 1: '100100001', 2: '001100001', 3: '101100000', 4: '000110001',
  5: '100110000', 6: '001110000', 7: '000100101', 8: '100100100', 9: '001100100',
  A: '100001001', B: '001001001', C: '101001000', D: '000011001', E: '100011000',
  F: '001011000', G: '000001101', H: '100001100', I: '001001100', J: '000011100',
  K: '100000011', L: '001000011', M: '101000010', N: '000010011', O: '100010010',
  P: '001010010', Q: '000000111', R: '100000110', S: '001000110', T: '000010110',
  U: '110000001', V: '011000001', W: '111000000', X: '010010001', Y: '110010000',
  Z: '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100',
  '*': '010010100', // start/stop
};

function code39Bars(text) {
  const clean = String(text || '').toUpperCase().replace(/[^0-9A-Z\-. ]/g, '').slice(0, 24);
  const chars = `*${clean}*`;
  const bars = [];
  [...chars].forEach((ch, ci) => {
    const pattern = CODE39[ch] || CODE39['-'];
    if (ci > 0) bars.push({ units: 1, bar: false }); // narrow inter-character gap
    for (let i = 0; i < 9; i++) bars.push({ units: pattern[i] === '1' ? 2 : 1, bar: i % 2 === 0 });
  });
  return bars;
}

/* ─── visual pieces ─────────────────────────────────────────────────── */

function SecurityBg() {
  return (
    <>
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, rgba(184,150,46,0.08) 0 2px, transparent 2px 7px), repeating-linear-gradient(-45deg, rgba(40,70,140,0.05) 0 2px, transparent 2px 9px)`,
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 84% 24%, rgba(212,175,55,0.14), transparent 42%), radial-gradient(circle at 6% 92%, rgba(40,70,140,0.08), transparent 44%)',
        }}
      />
    </>
  );
}

function LogoMark({ size = 40, opacity = 1 }) {
  return (
    <img
      src={brandLogo.url}
      alt=""
      draggable={false}
      onError={(e) => {
        if (e.currentTarget.dataset.fb) return;
        e.currentTarget.dataset.fb = '1';
        e.currentTarget.src = brandLogo.urlRemote;
      }}
      style={{ width: size, height: size, flexShrink: 0, opacity, objectFit: 'contain', display: 'block' }}
    />
  );
}

function Photo({ staff, w = 150, h = 190 }) {
  const { initials } = nameParts(staff?.name);
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [staff?.photoUrl]);
  const showImg = Boolean(staff?.photoUrl) && !broken;
  return (
    <div
      style={{
        width: w, height: h, position: 'relative', background: '#e9e2cf',
        border: '3px solid #ffffff', boxSizing: 'content-box',
        boxShadow: '0 0 0 1px rgba(23,23,31,0.28), 0 3px 8px rgba(23,23,31,0.28)',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width={w * 0.52} height={h * 0.46} viewBox="0 0 60 70" fill="none" aria-hidden="true">
          <circle cx="30" cy="22" r="13" fill="#c9c2ae" />
          <path d="M5 70c0-14.5 11-24.5 25-24.5S55 55.5 55 70" fill="#c9c2ae" />
        </svg>
        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: '#948d7a', letterSpacing: 3 }}>{initials || 'TB'}</span>
      </div>
      {showImg && (
        <img
          src={staff.photoUrl}
          alt=""
          onError={() => setBroken(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      {/* hologram shimmer */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(115deg, rgba(255,255,255,0) 32%, rgba(230,210,138,0.5) 46%, rgba(150,200,255,0.35) 53%, rgba(255,255,255,0) 63%)',
          mixBlendMode: 'screen', opacity: 0.55,
        }}
      />
    </div>
  );
}

function Label({ children, size = 6, color = MUTED }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase', color, marginBottom: 1.5 }}>
      {children}
    </div>
  );
}

function MicroFooter({ right = 'FORM TB-1 · USA' }) {
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 14,
        background: '#13131b', display: 'flex', alignItems: 'center',
        padding: '0 10px', justifyContent: 'space-between', overflow: 'hidden',
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: 4.4, letterSpacing: 1.1, color: '#7d7768', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        TRADINGBIBLE LLC · DELAWARE USA · EMPLOYEE IDENTIFICATION · TRADINGBIBLE LLC · DELAWARE USA · EMPLOYEE IDENTIFICATION · TRADINGBIBLE LLC · DELAWARE USA ·
      </div>
      <div style={{ fontFamily: FONT, fontSize: 5.2, fontWeight: 800, letterSpacing: 1.4, color: GOLD_LIGHT, whiteSpace: 'nowrap', paddingLeft: 8 }}>
        {right}
      </div>
    </div>
  );
}

/* ─── front ─────────────────────────────────────────────────────────── */

function Front({ staff, bioUrl }) {
  const { first, middle, last } = nameParts(staff?.name);
  const isAdmin = staff?.isAdmin === true
    || ['malibaequityholdingsltd@outlook.com', 'tradingbible@hotmail.com'].includes(String(staff?.email || '').toLowerCase());
  const hired = staff?.hiredAt || staff?.startDate;

  return (
    <div style={{ position: 'absolute', inset: 0, background: CREAM, fontFamily: FONT, color: INK, overflow: 'hidden' }}>
      <SecurityBg />
      {/* ghost logo watermark */}
      <div style={{ position: 'absolute', left: 322, top: 88, opacity: 0.05, pointerEvents: 'none' }}>
        <LogoMark size={230} />
      </div>

      {/* header — USA strip + brand band */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <div
          style={{
            height: 18, background: '#06060b', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 7, boxSizing: 'border-box',
            borderBottom: '1px solid rgba(212,175,55,0.4)',
          }}
        >
          <span style={{ fontSize: 5, color: GOLD }}>★</span>
          <span style={{ fontSize: 7.2, fontWeight: 800, color: GOLD_LIGHT, letterSpacing: 3.6, textTransform: 'uppercase' }}>
            United States of America
          </span>
          <span style={{ fontSize: 5, color: GOLD }}>★</span>
        </div>
        <div
          style={{
            height: 56, background: HEADER_BG, display: 'flex', alignItems: 'center',
            gap: 10, padding: '0 13px', borderBottom: `3px solid ${GOLD}`, boxSizing: 'border-box',
          }}
        >
          <LogoMark size={37} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 19.5, fontWeight: 900, letterSpacing: 1.5, lineHeight: 1, whiteSpace: 'nowrap' }}>
              <span style={{ color: '#f4f1e6' }}>TRADING</span>
              <span style={{ color: '#d4af37' }}>BIBLE</span>
            </div>
            <div style={{ fontSize: 6.6, fontWeight: 800, color: GOLD_LIGHT, letterSpacing: 2.6, marginTop: 4, textTransform: 'uppercase' }}>
              Employee Identification Card
            </div>
          </div>
          <div style={{ textAlign: 'right', lineHeight: 1.55 }}>
            <div style={{ fontSize: 7.8, fontWeight: 700, color: '#cfc9b6', whiteSpace: 'nowrap' }}>TradingBible LLC · Delaware</div>
            <div style={{ fontSize: 5.8, fontWeight: 700, color: GOLD_LIGHT, letterSpacing: 1.7 }}>TRADINGBIBLE.APP</div>
          </div>
        </div>
      </div>

      {/* photo */}
      <div style={{ position: 'absolute', left: 14, top: 88 }}>
        <Photo staff={staff} w={150} h={190} />
      </div>

      {/* employee number box */}
      <div
        style={{
          position: 'absolute', left: 14, top: 294, width: 156, height: 32, boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.72)', border: '1px solid #e0d9c4', borderLeft: `4px solid ${GOLD}`, padding: '3px 0 0 8px',
        }}
      >
        <Label size={5.4}>Employee No.</Label>
        <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6 }}>{employeeNo(staff)}</div>
      </div>

      {/* signature */}
      <div style={{ position: 'absolute', left: 14, top: 336, width: 156 }}>
        <div style={{ fontFamily: SCRIPT, fontSize: 15.5, lineHeight: 1, color: '#2a2a36', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {staff?.name || 'Team Member'}
        </div>
        <div style={{ height: 1, background: '#b8b19c', marginTop: 8 }} />
        <Label size={5}>Bearer signature</Label>
      </div>

      {/* name fields */}
      <div style={{ position: 'absolute', left: 184, top: 88, width: 340, display: 'flex', gap: 20 }}>
        <div style={{ width: 160, minWidth: 0 }}>
          <Label>LN (Last Name)</Label>
          <div style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {last || first}
          </div>
        </div>
        <div style={{ width: 160, minWidth: 0 }}>
          <Label>FN (First, Middle)</Label>
          <div style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {`${first}${middle ? `, ${middle}` : ''}`}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 184, top: 134, width: 340, height: 1, background: '#dbd4bf' }} />

      {/* field grid */}
      <div style={{ position: 'absolute', left: 184, top: 144, width: 340, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <Label>Title</Label>
          <div style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staff?.title || 'Team Member'}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <Label>Department</Label>
          <div style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staff?.department || 'TradingBible'}</div>
        </div>
        <div>
          <Label>Date Hired</Label>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700 }}>{fmtDate(hired)}</div>
        </div>
        <div>
          <Label>Expires</Label>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700 }}>{expiryDate(staff)}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 184, top: 246, width: 340, height: 1, background: '#dbd4bf' }} />

      {/* company email + location */}
      <div style={{ position: 'absolute', left: 184, top: 254, width: 340, minWidth: 0 }}>
        <Label>Company Email</Label>
        <div style={{ fontFamily: MONO, fontSize: 9.8, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {companyEmail(staff)}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 184, top: 292, width: 340, minWidth: 0 }}>
        <Label>Location</Label>
        <div style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staff?.location || 'Remote'}</div>
      </div>

      {/* class / status rail */}
      <div style={{ position: 'absolute', left: 536, top: 214, width: 96 }}>
        <div style={{ border: '1px solid #ddd6c0', borderTop: `3px solid ${GOLD}`, background: 'rgba(255,255,255,0.68)', padding: '4px 6px', marginBottom: 6 }}>
          <Label size={5.2}>Class</Label>
          <div style={{ fontSize: 9.5, fontWeight: 800 }}>{isAdmin ? 'A — ADMIN' : 'E — EMPLOYEE'}</div>
        </div>
        <div style={{ border: '1px solid #ddd6c0', background: 'rgba(255,255,255,0.68)', padding: '4px 6px' }}>
          <Label size={5.2}>Status</Label>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#1c6b3c' }}>ACTIVE</div>
        </div>
      </div>

      {/* QR — scan to open the public bio */}
      <div style={{ position: 'absolute', left: 536, top: 282, width: 96, textAlign: 'center' }}>
        <div style={{ background: '#ffffff', padding: 4, boxShadow: '0 1px 4px rgba(23,23,31,0.25)' }}>
          <QRCodeSVG value={bioUrl} size={84} level="M" marginSize={1} bgColor="#ffffff" fgColor="#17171f" />
        </div>
        <div style={{ fontSize: 4.9, fontWeight: 800, letterSpacing: 1, color: MUTED, marginTop: 4, textTransform: 'uppercase' }}>
          Scan to view profile
        </div>
      </div>

      <MicroFooter />
    </div>
  );
}

/* ─── back ──────────────────────────────────────────────────────────── */

function Back({ staff, bioUrl }) {
  const bars = code39Bars(employeeNo(staff));
  // Narrow-module width: 1.44 design px = 7.5 mil on the printed card (the
  // Code 39 spec minimum); shrink if a custom number makes the code long.
  const codeUnits = bars.reduce((a, b) => a + b.units, 0) || 1;
  const u = Math.min(1.44, 300 / codeUnits);
  const hired = staff?.hiredAt || staff?.startDate;
  return (
    <div style={{ position: 'absolute', inset: 0, background: CREAM, fontFamily: FONT, color: INK, overflow: 'hidden' }}>
      <SecurityBg />
      <div style={{ position: 'absolute', left: 372, top: 84, opacity: 0.05, pointerEvents: 'none' }}>
        <LogoMark size={220} />
      </div>

      {/* magnetic stripe */}
      <div
        style={{
          position: 'absolute', top: 18, left: 0, right: 0, height: 42,
          background: 'linear-gradient(180deg, #0b0b10 0%, #26262f 30%, #0d0d13 100%)',
          boxShadow: 'inset 0 -2px 3px rgba(0,0,0,0.75), inset 0 2px 2px rgba(255,255,255,0.07)',
          borderTop: '1px solid #000', borderBottom: '1px solid #000',
        }}
      />

      {/* barcode — real scannable Code 39 encoding the employee number */}
      <div style={{ position: 'absolute', left: 14, top: 76, width: 330, boxSizing: 'border-box', background: '#ffffff', border: '1px solid #ddd6c2', padding: '7px 12px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 38 }}>
          {bars.map((b, i) => (b.bar
            ? <div key={i} style={{ width: b.units * u, height: '100%', background: '#17171f' }} />
            : <div key={i} style={{ width: b.units * u }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 5, letterSpacing: 1, color: MUTED, fontWeight: 700 }}>CODE 39</span>
          <span style={{ fontFamily: MONO, fontSize: 5.4, color: MUTED }}>{employeeNo(staff)}</span>
        </div>
      </div>

      {/* return-to block */}
      <div style={{ position: 'absolute', left: 14, top: 152, width: 330 }}>
        <Label size={5.8}>If found, please return to</Label>
        <div style={{ fontSize: 9.6, fontWeight: 800 }}>TradingBible LLC</div>
        <div style={{ fontSize: 8, fontWeight: 600, color: '#4d493c', marginTop: 1 }}>Delaware, United States</div>
        <div style={{ fontSize: 8, fontWeight: 600, color: '#4d493c', marginTop: 1 }}>support@tradingbible.app · tradingbible.app</div>
      </div>

      {/* emergency contact */}
      <div style={{ position: 'absolute', left: 14, top: 208, width: 330 }}>
        <Label size={5.8}>Emergency contact</Label>
        {staff?.emergencyContact?.name || staff?.emergencyContact?.phone ? (
          <div>
            <div style={{ fontSize: 8.6, fontWeight: 700 }}>{staff.emergencyContact?.name || '—'}</div>
            <div style={{ fontFamily: MONO, fontSize: 8.2, fontWeight: 700 }}>{staff.emergencyContact?.phone || '—'}</div>
          </div>
        ) : (
          <div style={{ fontSize: 8.2, fontWeight: 600, color: MUTED }}>Not on file</div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 14, top: 252, width: 330, height: 1, background: '#dbd4bf' }} />

      {/* dates / number */}
      <div style={{ position: 'absolute', left: 14, top: 260, width: 330, display: 'flex', gap: 18 }}>
        <div>
          <Label size={5.4}>Issued</Label>
          <div style={{ fontFamily: MONO, fontSize: 8.4, fontWeight: 700 }}>{fmtDate(hired)}</div>
        </div>
        <div>
          <Label size={5.4}>Expires</Label>
          <div style={{ fontFamily: MONO, fontSize: 8.4, fontWeight: 700 }}>{expiryDate(staff)}</div>
        </div>
        <div>
          <Label size={5.4}>Employee No.</Label>
          <div style={{ fontFamily: MONO, fontSize: 8.4, fontWeight: 700 }}>{employeeNo(staff)}</div>
        </div>
      </div>

      {/* fine print */}
      <div style={{ position: 'absolute', left: 14, top: 306, width: 330, fontSize: 5.6, lineHeight: 1.6, color: MUTED, fontWeight: 600 }}>
        This card is property of TradingBible LLC and must be returned upon request. If lost or found, contact support@tradingbible.app.
        This is a company-issued identification card — not a government-issued ID.
      </div>

      {/* QR */}
      <div style={{ position: 'absolute', left: 431, top: 82, width: 132, textAlign: 'center' }}>
        <div style={{ background: '#ffffff', padding: 6, boxShadow: '0 1px 5px rgba(23,23,31,0.3)' }}>
          <QRCodeSVG value={bioUrl} size={120} level="M" marginSize={1} bgColor="#ffffff" fgColor="#17171f" />
        </div>
        <div style={{ fontSize: 5.6, fontWeight: 800, letterSpacing: 1.4, color: MUTED, marginTop: 5, textTransform: 'uppercase' }}>
          Scan to view full profile
        </div>
      </div>

      {/* signature */}
      <div style={{ position: 'absolute', left: 406, top: 250, width: 182, textAlign: 'center' }}>
        <div style={{ fontFamily: SCRIPT, fontSize: 15, lineHeight: 1, color: '#2a2a36', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {staff?.name || 'Team Member'}
        </div>
        <div style={{ height: 1, background: '#b8b19c', marginTop: 7 }} />
        <Label size={5}>Bearer signature</Label>
      </div>

      {/* verified badge */}
      {staff?.verified && (
        <div
          style={{
            position: 'absolute', left: 431, top: 300, width: 132, textAlign: 'center',
            background: 'rgba(28,107,60,0.1)', border: '1px solid rgba(28,107,60,0.4)',
            padding: '4px 0', fontSize: 6, fontWeight: 800, letterSpacing: 1.5, color: '#1c6b3c',
            textTransform: 'uppercase',
          }}
        >
          ✓ Verified staff identity
        </div>
      )}

      <MicroFooter right="USA · NOT A GOV'T ID" />
    </div>
  );
}

/* ─── card shell ────────────────────────────────────────────────────── */

export function StaffIdCard({ staff, side = 'front', scale = 1, origin = '', className = '', style = {} }) {
  if (!staff) return null;
  const id = staff.id || staff.appId;
  const bioUrl = staff.bioUrl || `${origin || (typeof window !== 'undefined' ? window.location.origin : '')}/staff/${id}`;
  return (
    <div className={`tb-idcard-slot ${className}`} style={{ width: CARD_W * scale, height: CARD_H * scale, position: 'relative', ...style }}>
      <div
        style={{
          position: 'absolute', top: 0, left: 0, width: CARD_W, height: CARD_H,
          transform: `scale(${scale})`, transformOrigin: 'top left',
        }}
      >
        <div
          style={{
            width: CARD_W, height: CARD_H, position: 'relative', borderRadius: 18,
            overflow: 'hidden', background: CREAM, boxShadow: '0 10px 26px rgba(0,0,0,0.42)',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          }}
        >
          {side === 'back' ? <Back staff={staff} bioUrl={bioUrl} /> : <Front staff={staff} bioUrl={bioUrl} />}
          {/* card edge */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 18, border: '1px solid rgba(23,23,31,0.4)', pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  );
}

export default StaffIdCard;
