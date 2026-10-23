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
 * Typography note: 1 design px prints at 0.375pt. The type scale below is
 * deliberately larger than screen-first sizes — labels print ~4pt, values
 * ~5pt, names ~8pt, so every line stays legible on a home/office printer.
 */

export const CARD_W = 648; // 2× CR80 @ 96dpi
export const CARD_H = 408;

const INK = '#f4f1e6';
const MUTED = '#cfc3a1';
const GOLD = '#c9a227';
const GOLD_LIGHT = '#f0df9a';
const WORD_GOLD = '#d4af37';
const CREAM = '#0b0b12';
const CARD_BG = 'linear-gradient(145deg, #0b0b12 0%, #151521 55%, #08080d 100%)';
const HEADER_BG = 'linear-gradient(100deg, #07070c 0%, #171722 55%, #0a0a10 100%)';
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

/* Keep long surnames (e.g. OKECHUKWU) fully visible instead of eliding them. */
function fitNameSize(text, maxWidth, base = 23) {
  const len = Math.max(1, String(text || '').length);
  return Math.max(14.5, Math.min(base, maxWidth / (len * 0.62)));
}

// Printed QRs always open the official public site — never a localhost or
// preview origin. VITE_PUBLIC_SITE_URL can override this for staging.
const PUBLIC_SITE = String(import.meta.env.VITE_PUBLIC_SITE_URL || 'https://tradingbible.app').replace(/\/+$/, '');

/** Canonical scanned-profile URL encoded in the card QR + barcode link. */
export function publicBioUrl(staff, origin = '') {
  const id = staff?.id || staff?.appId || '';
  return `${String(origin || PUBLIC_SITE).replace(/\/+$/, '')}/staff/${encodeURIComponent(id)}`;
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
          backgroundImage: `repeating-linear-gradient(45deg, rgba(212,175,55,0.14) 0 2px, transparent 2px 7px), repeating-linear-gradient(-45deg, rgba(212,175,55,0.06) 0 2px, transparent 2px 9px)`,
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 84% 24%, rgba(212,175,55,0.20), transparent 42%), radial-gradient(circle at 6% 92%, rgba(212,175,55,0.10), transparent 44%)',
        }}
      />
    </>
  );
}

function LogoMark({ size = 58, opacity = 1 }) {
  const [src, setSrc] = useState(brandLogo.url);
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: size, height: size, flexShrink: 0, opacity, boxSizing: 'border-box',
          display: 'grid', placeItems: 'center', borderRadius: 8,
          background: '#0a0a0f', border: '1px solid rgba(212,175,55,0.7)',
          color: GOLD_LIGHT, fontFamily: DISPLAY, fontWeight: 800, fontSize: size * 0.42,
        }}
      >
        TB
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      loading="eager"
      decoding="sync"
      onError={() => {
        if (src !== brandLogo.urlRemote) setSrc(brandLogo.urlRemote);
        else setBroken(true);
      }}
      style={{ width: size, height: size, flexShrink: 0, opacity, objectFit: 'contain', display: 'block' }}
    />
  );
}

function WatermarkMark({ size = 250 }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: size, height: size, display: 'grid', placeItems: 'center',
          pointerEvents: 'none', opacity: 0.24, color: GOLD,
          fontFamily: DISPLAY, fontWeight: 800, fontSize: size * 0.46,
          letterSpacing: -6, lineHeight: 1, userSelect: 'none',
        }}
      >
        TB
      </div>
    );
  }
  return (
    <img
      src={brandLogo.url}
      alt=""
      draggable={false}
      loading="eager"
      decoding="sync"
      onError={() => setBroken(true)}
      style={{
        width: size, height: size, display: 'block', pointerEvents: 'none',
        opacity: 0.24,
        filter: 'saturate(1.2) brightness(1.25)',
      }}
    />
  );
}

function Photo({ staff, w = 150, h = 180 }) {
  const { initials } = nameParts(staff?.name);
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [staff?.photoUrl]);
  const showImg = Boolean(staff?.photoUrl) && !broken;
  return (
    <div
      style={{
        width: w, height: h, position: 'relative',
        background: 'linear-gradient(155deg, #f6efdd 0%, #e9e0ca 58%, #ddd2b8 100%)',
        border: '3px solid #f7f2e5', boxSizing: 'content-box',
        boxShadow: '0 0 0 1px rgba(212,175,55,0.9), 0 5px 14px rgba(0,0,0,0.55)',
        overflow: 'hidden',
      }}
    >
      {!showImg && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width={w * 0.52} height={h * 0.46} viewBox="0 0 60 70" fill="none" aria-hidden="true">
            <circle cx="30" cy="22" r="13" fill="#c9c2ae" />
            <path d="M5 70c0-14.5 11-24.5 25-24.5S55 55.5 55 70" fill="#c9c2ae" />
          </svg>
          <span style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 800, color: '#948d7a', letterSpacing: 3 }}>{initials || 'TB'}</span>
        </div>
      )}
      {showImg && (
        <img
          src={staff.photoUrl}
          alt=""
          loading="eager"
          decoding="sync"
          onError={() => setBroken(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      {/* hologram shimmer */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(115deg, rgba(255,255,255,0) 32%, rgba(230,210,138,0.5) 46%, rgba(150,200,255,0.35) 53%, rgba(255,255,255,0) 63%)',
          mixBlendMode: 'screen', opacity: 0.28,
        }}
      />
    </div>
  );
}

function Label({ children, size = 10, color = MUTED }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color, marginBottom: 2, whiteSpace: 'nowrap' }}>
      {children}
    </div>
  );
}

function MicroFooter({ right = 'FORM TB-1 · USA' }) {
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 16,
        background: '#05050a', display: 'flex', alignItems: 'center',
        padding: '0 10px', justifyContent: 'space-between', overflow: 'hidden',
        borderTop: '1px solid rgba(212,175,55,0.4)', boxSizing: 'border-box',
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: 0.5, color: '#c9b77c', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        TradingBible LLC · Delaware, USA
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: GOLD_LIGHT, whiteSpace: 'nowrap', paddingLeft: 8 }}>
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
  const lastText = last || first;
  const firstText = `${first}${middle ? `, ${middle}` : ''}`;
  const nameSize = Math.min(fitNameSize(lastText, 190), fitNameSize(firstText, 132));
  const title = staff?.title || 'Team Member';
  const department = staff?.department || 'TradingBible';
  const location = staff?.location || 'Remote';
  const email = companyEmail(staff);

  return (
    <div style={{ position: 'absolute', inset: 0, background: CARD_BG, fontFamily: FONT, color: INK, overflow: 'hidden' }}>
      <SecurityBg />
      <div style={{ position: 'absolute', inset: 6, border: '1px solid rgba(212,175,55,0.24)', borderRadius: 12, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 330, top: 96, pointerEvents: 'none' }}>
        <WatermarkMark size={250} />
      </div>

      {/* header — USA strip + brand band */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <div
          style={{
            height: 20, background: '#05050a', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 7, boxSizing: 'border-box',
            borderBottom: '1px solid rgba(212,175,55,0.4)',
          }}
        >
          <span style={{ fontSize: 6, color: GOLD }}>★</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 9, fontWeight: 700, color: GOLD_LIGHT, letterSpacing: 1.2, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            United States of America
          </span>
          <span style={{ fontSize: 6, color: GOLD }}>★</span>
        </div>
        <div
          style={{
            height: 62, background: HEADER_BG, display: 'flex', alignItems: 'center',
            gap: 11, padding: '0 14px', borderBottom: `3px solid ${GOLD}`,
            boxSizing: 'border-box', overflow: 'hidden',
          }}
        >
          <LogoMark size={58} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 800, letterSpacing: 0.2, lineHeight: 1, whiteSpace: 'nowrap' }}>
              <span style={{ color: '#f4f1e6', WebkitTextStroke: '0.4px #f4f1e6' }}>TRADING</span>
              <span style={{ color: WORD_GOLD, WebkitTextStroke: `0.4px ${WORD_GOLD}` }}>BIBLE</span>
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 9.5, fontWeight: 700, color: GOLD_LIGHT, letterSpacing: 0.6, marginTop: 4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Employee Identification Card
            </div>
          </div>
          <div style={{ textAlign: 'right', lineHeight: 1.5, flexShrink: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 10, fontWeight: 700, color: '#e6dfcc', whiteSpace: 'nowrap' }}>TradingBible LLC · Delaware</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 8, fontWeight: 700, color: GOLD_LIGHT, letterSpacing: 0.7, whiteSpace: 'nowrap' }}>TRADINGBIBLE.NET</div>
          </div>
        </div>
      </div>

      {/* name */}
      <div style={{ position: 'absolute', left: 184, top: 92, width: 340, display: 'flex', gap: 18 }}>
        <div style={{ width: 190, minWidth: 0 }}>
          <Label size={12}>Last Name</Label>
          <div style={{ fontFamily: DISPLAY, fontSize: nameSize, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, lineHeight: 1.12, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lastText}
          </div>
        </div>
        <div style={{ width: 132, minWidth: 0 }}>
          <Label size={12}>First Name</Label>
          <div style={{ fontFamily: DISPLAY, fontSize: nameSize, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, lineHeight: 1.12, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {firstText}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 184, top: 144, width: 340, height: 1, background: 'rgba(212,175,55,0.3)' }} />

      {/* title */}
      <div style={{ position: 'absolute', left: 184, top: 154, width: 340, minWidth: 0 }}>
        <Label size={12}>Title</Label>
        <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
      </div>

      {/* department + location */}
      <div style={{ position: 'absolute', left: 184, top: 200, width: 340, display: 'flex', gap: 18 }}>
        <div style={{ width: 190, minWidth: 0 }}>
          <Label size={12}>Department</Label>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e9e3d2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{department}</div>
        </div>
        <div style={{ width: 132, minWidth: 0 }}>
          <Label size={12}>Location</Label>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e9e3d2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{location}</div>
        </div>
      </div>

      {/* company email */}
      <div style={{ position: 'absolute', left: 184, top: 242, width: 340, minWidth: 0 }}>
        <Label size={12}>Company Email</Label>
        <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: GOLD_LIGHT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {email}
        </div>
      </div>

      {/* class / status */}
      <div style={{ position: 'absolute', left: 184, top: 300, width: 340, display: 'flex', gap: 10 }}>
        <div style={{ width: 165, boxSizing: 'border-box', border: '1px solid rgba(212,175,55,0.34)', borderTop: `3px solid ${GOLD}`, background: 'rgba(255,255,255,0.035)', padding: '4px 7px' }}>
          <Label size={11}>Class</Label>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap' }}>{isAdmin ? 'A — ADMIN' : 'E — EMPLOYEE'}</div>
        </div>
        <div style={{ width: 165, boxSizing: 'border-box', border: '1px solid rgba(212,175,55,0.28)', background: 'rgba(255,255,255,0.035)', padding: '4px 7px' }}>
          <Label size={11}>Status</Label>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7ee2a8' }}>ACTIVE</div>
        </div>
      </div>

      {/* photo — 3:4 portrait, matching the official team headshots */}
      <div style={{ position: 'absolute', left: 14, top: 92 }}>
        <Photo staff={staff} w={150} h={200} />
      </div>

      {/* employee number */}
      <div
        style={{
          position: 'absolute', left: 14, top: 302, width: 156, height: 40, boxSizing: 'border-box',
          background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.34)',
          borderLeft: `4px solid ${GOLD}`, padding: '0 0 0 8px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}
      >
        <Label size={10}>Employee No.</Label>
        <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, letterSpacing: 0.2, color: '#ffffff', whiteSpace: 'nowrap' }}>{employeeNo(staff)}</div>
      </div>

      {/* signature */}
      <div style={{ position: 'absolute', left: 14, top: 348, width: 156 }}>
        <div style={{ fontFamily: SCRIPT, fontSize: 17, lineHeight: 1, color: '#f4f1e6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {staff?.name || 'Team Member'}
        </div>
        <div style={{ height: 1, background: 'rgba(212,175,55,0.5)', marginTop: 7 }} />
        <Label size={10.5}>Bearer signature</Label>
      </div>

      {/* QR — scan to open the public bio */}
      <div style={{ position: 'absolute', left: 536, top: 272, width: 98, textAlign: 'center' }}>
        <div style={{ background: '#ffffff', padding: 5, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          <QRCodeSVG value={bioUrl} size={80} level="M" marginSize={1} bgColor="#ffffff" fgColor="#17171f" />
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.2, color: '#e2d6b4', marginTop: 3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Scan for profile
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
    <div style={{ position: 'absolute', inset: 0, background: CARD_BG, fontFamily: FONT, color: INK, overflow: 'hidden' }}>
      <SecurityBg />
      <div style={{ position: 'absolute', inset: 6, border: '1px solid rgba(212,175,55,0.24)', borderRadius: 12, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 380, top: 92, pointerEvents: 'none' }}>
        <WatermarkMark size={240} />
      </div>

      {/* magnetic stripe */}
      <div
        style={{
          position: 'absolute', top: 18, left: 0, right: 0, height: 42,
          background: 'linear-gradient(180deg, #05050a 0%, #2b2b36 30%, #08080d 100%)',
          boxShadow: 'inset 0 -2px 3px rgba(0,0,0,0.75), inset 0 2px 2px rgba(255,255,255,0.07)',
          borderTop: '1px solid rgba(212,175,55,0.3)', borderBottom: '1px solid rgba(212,175,55,0.3)',
        }}
      />

      {/* barcode — real scannable Code 39 encoding the employee number */}
      <div style={{ position: 'absolute', left: 14, top: 72, width: 330, boxSizing: 'border-box', background: '#ffffff', border: '1px solid rgba(212,175,55,0.55)', padding: '6px 12px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 34 }}>
          {bars.map((b, i) => (b.bar
            ? <div key={i} style={{ width: b.units * u, height: '100%', background: '#17171f' }} />
            : <div key={i} style={{ width: b.units * u }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
          <span style={{ fontSize: 9.5, letterSpacing: 0.4, color: '#5b5544', fontWeight: 700 }}>CODE 39</span>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#17171f', fontWeight: 700, whiteSpace: 'nowrap' }}>{employeeNo(staff)}</span>
        </div>
      </div>

      {/* return-to block */}
      <div style={{ position: 'absolute', left: 14, top: 140, width: 330 }}>
        <Label size={12}>If found, please return to</Label>
        <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 800, color: '#ffffff' }}>TradingBible LLC</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#cfc6b0', marginTop: 1.5 }}>Delaware, United States</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#cfc6b0', marginTop: 1.5 }}>support@tradingbible.app · tradingbible.app</div>
      </div>

      <div style={{ position: 'absolute', left: 14, top: 212, width: 330, height: 1, background: 'rgba(212,175,55,0.28)' }} />

      {/* emergency contact */}
      <div style={{ position: 'absolute', left: 14, top: 228, width: 330 }}>
        <Label size={12}>Emergency contact</Label>
        {staff?.emergencyContact?.name || staff?.emergencyContact?.phone ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{staff.emergencyContact?.name || '—'}</div>
            <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, marginTop: 1, color: '#e9e3d2', whiteSpace: 'nowrap' }}>{staff.emergencyContact?.phone || '—'}</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, fontWeight: 600, color: '#cfc6b0' }}>Not on file</div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 14, top: 278, width: 330, height: 1, background: 'rgba(212,175,55,0.3)' }} />

      {/* dates / number */}
      <div style={{ position: 'absolute', left: 14, top: 290, width: 330, display: 'flex', gap: 22 }}>
        <div>
          <Label size={11.5}>Issued</Label>
          <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(hired)}</div>
        </div>
        <div>
          <Label size={11.5}>Expires</Label>
          <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{expiryDate(staff)}</div>
        </div>
        <div>
          <Label size={11.5}>Employee No.</Label>
          <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{employeeNo(staff)}</div>
        </div>
      </div>

      {/* fine print — short, readable, and not competing with the footer */}
      <div style={{ position: 'absolute', left: 14, top: 330, width: 330, fontSize: 10.5, lineHeight: 1.45, color: '#cfc6b0', fontWeight: 600 }}>
        Property of TradingBible LLC. Return on request.<br />
        Not a government-issued ID.
      </div>

      {/* QR */}
      <div style={{ position: 'absolute', left: 431, top: 80, width: 132, textAlign: 'center' }}>
        <div style={{ background: '#ffffff', padding: 6, boxShadow: '0 1px 5px rgba(0,0,0,0.55)' }}>
          <QRCodeSVG value={bioUrl} size={120} level="M" marginSize={1} bgColor="#ffffff" fgColor="#17171f" />
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.2, color: '#e2d6b4', marginTop: 5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Scan for profile
        </div>
      </div>

      {/* signature */}
      <div style={{ position: 'absolute', left: 406, top: 258, width: 182, textAlign: 'center' }}>
        <div style={{ fontFamily: SCRIPT, fontSize: 18, lineHeight: 1, color: '#f4f1e6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {staff?.name || 'Team Member'}
        </div>
        <div style={{ height: 1, background: 'rgba(212,175,55,0.5)', marginTop: 7 }} />
        <Label size={10.5}>Bearer signature</Label>
      </div>

      {/* verified badge */}
      {staff?.verified && (
        <div
          style={{
            position: 'absolute', left: 431, top: 302, width: 132, textAlign: 'center',
            background: 'rgba(126,226,168,0.08)', border: '1px solid rgba(126,226,168,0.4)',
            padding: '4px 0', fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: '#7ee2a8',
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
  const bioUrl = staff.bioUrl || publicBioUrl(staff, origin);
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
          <div style={{ position: 'absolute', inset: 0, borderRadius: 18, border: '1px solid rgba(212,175,55,0.5)', pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  );
}

export default StaffIdCard;
