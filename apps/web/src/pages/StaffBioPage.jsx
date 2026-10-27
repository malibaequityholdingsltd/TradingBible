import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BadgeCheck, Building2, Facebook, Fingerprint, Github, Globe, Instagram,
  Linkedin, Mail, Shield, Twitter, Youtube,
} from 'lucide-react';
import { brandLogo } from '@/lib/brand';
import { API_SERVER_URL } from '@/lib/apiServerClient';

// Public profile — opened by scanning the QR code printed on a staff ID
// card. Standalone (no auth, no app sidebar): anyone with the physical
// card can view it. Only company-safe fields are shown.

const SOCIAL_ICONS = {
  linkedin: Linkedin,
  twitter: Twitter,
  x: Twitter,
  github: Github,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  website: Globe,
};

function fmtDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Fact({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6a665a]">{label}</div>
      <div className={`mt-0.5 truncate text-[12.5px] font-semibold text-[#e6e1d2] ${mono ? 'font-mono tracking-tight' : ''}`}>{value}</div>
    </div>
  );
}

function Panel({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 ${className}`}>
      <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a8577]">
        <span className="h-1 w-1 rounded-full bg-[#d4af37]" /> {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/* Digital counterpart of the printed CR80 card: same USA strip, brand
   band, cream photo frame and gold footer as the physical credential. */
function VirtualCard({ staff }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#d4af37]/30 bg-[#0a0a10] shadow-[0_30px_90px_-45px_rgba(212,175,55,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[#d4af37]/20 bg-[#06060a] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#d6c47a] sm:px-6 sm:text-[10px]">
        <span>★ United States of America ★</span>
        <span>TradingBible LLC · Delaware</span>
      </div>

      <div className="relative overflow-hidden border-b border-[#d4af37]/20 bg-[linear-gradient(120deg,#141207_0%,#0b0b11_55%,#09090e_100%)] px-4 py-4 sm:px-6">
        <img
          src={brandLogo.url}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 object-contain opacity-[0.06]"
          style={{ filter: 'grayscale(1) brightness(2)' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={brandLogo.url} alt="TradingBible" className="h-11 w-11 shrink-0 object-contain" />
            <div className="min-w-0">
              <div className="font-display text-xl font-extrabold leading-none tracking-tight sm:text-2xl">
                <span className="text-[#f4f1e6]">TRADING</span>
                <span className="text-[#d4af37]">BIBLE</span>
              </div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#d6c47a] sm:text-[10px]">
                Employee identification · digital
              </div>
            </div>
          </div>
          {staff.verified && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified staff
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-5 px-4 py-5 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-6 sm:px-6 sm:py-6">
        <div className="mx-auto w-[124px] sm:mx-0">
          <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-[#d4af37]/35 bg-[#e9e2cf]">
            {staff.photoUrl ? (
              <img src={staff.photoUrl} alt={staff.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center font-display text-4xl font-extrabold text-[#948d7a]">
                {(staff.name || 'TB').trim().charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#6a665a]">
            <Fingerprint className="h-3 w-3 text-[#d4af37]" /> Staff photo
          </div>
        </div>

        <div className="min-w-0 text-center sm:text-left">
          <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#6a665a]">Name</div>
          <h1 className="mt-0.5 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{staff.name}</h1>
          <div className="mt-1 text-base font-semibold text-[#d4af37]">{staff.title || 'TradingBible team'}</div>
          <div className="mt-0.5 text-xs text-[#8a8577]">{staff.department ? `${staff.department} · ` : ''}TradingBible LLC</div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-left sm:grid-cols-4">
            <Fact label="Employee no." value={staff.employeeId || '—'} mono />
            <Fact label="Department" value={staff.department || '—'} />
            <Fact label="Location" value={staff.location || 'Delaware, USA'} />
            <Fact label="Joined" value={fmtDate(staff.startDate) || '—'} />
          </div>

          {staff.workEmail && (
            <a
              href={`mailto:${staff.workEmail}`}
              className="mt-4 inline-flex max-w-full items-center gap-2 rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-3.5 py-2 text-sm font-semibold text-[#e8c95a] transition hover:border-[#d4af37]/50 hover:bg-[#d4af37]/[0.12]"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{staff.workEmail}</span>
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[#d4af37]/15 bg-[#06060a] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#5c584c] sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3 w-3 text-[#d4af37]" /> TradingBible LLC · Delaware, USA
        </span>
        <span className="text-[#8a7a3a]">tradingbible.app · employee profile</span>
      </div>
    </section>
  );
}

export default function StaffBioPage() {
  const { id } = useParams();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_SERVER_URL}/staff/${encodeURIComponent(id)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.error === 'staff profile not found'
              ? 'This staff profile was not found.'
              : `Could not load profile (${res.status})`,
          );
        }
        if (alive) setStaff(data);
      } catch (e) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (id) load();
    return () => { alive = false; };
  }, [id]);

  const socials = staff?.socials && typeof staff.socials === 'object' ? staff.socials : null;
  const socialEntries = socials ? Object.entries(socials).filter(([, url]) => Boolean(url)) : [];

  return (
    <div className="tb-bio min-h-screen bg-[#08080d] text-[#f0ecdd]">
      {/* The public credential is standalone — never let the market ticker
          sit over this header, even if the route matcher above misses. */}
      <style>{'#tb-ticker{display:none!important}'}</style>
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-[#d4af37]/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#3b82f6]/[0.05] blur-[100px]" />
      </div>

      <header className="relative z-10 border-b border-[#d4af37]/20 bg-[#08080d]/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src={brandLogo.url} alt="" className="h-8 w-8 shrink-0 object-contain" />
            <span className="min-w-0">
              <span className="font-display block truncate text-lg font-extrabold leading-none tracking-tight">
                TRADING<span className="text-[#d4af37]">BIBLE</span>
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.22em] text-[#8a8577]">
                Official employee profile
              </span>
            </span>
          </Link>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d6c47a]">
            <Shield className="h-3 w-3" /> tradingbible.app
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
        {loading && (
          <div className="grid min-h-[50vh] place-items-center">
            <div className="flex items-center gap-3 text-[#8a8577]">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#d4af37]/40 border-t-[#d4af37]" />
              Loading staff profile…
            </div>
          </div>
        )}

        {!loading && (error || !staff) && (
          <div className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-[#0b0b10] text-center">
            <div className="border-b border-[#d4af37]/15 bg-[#06060a] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#8a7a3a]">
              ★ TradingBible LLC · Delaware ★
            </div>
            <div className="p-8 sm:p-10">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/[0.06]">
                <Shield className="h-8 w-8 text-[#d4af37]/60" />
              </div>
              <h2 className="mt-4 font-display text-xl font-extrabold">Profile unavailable</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">{error || 'This staff member does not have a public profile yet.'}</p>
              <p className="mt-3 text-xs leading-relaxed text-[#5c584c]">
                If you scanned a printed ID card, ask the card holder to have their profile completed in the admin portal.
              </p>
              <a
                href="/"
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/[0.07] px-4 py-2 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/[0.13]"
              >
                <Globe className="h-4 w-4" /> tradingbible.app
              </a>
            </div>
          </div>
        )}

        {!loading && staff && (
          <div className="space-y-4">
            <VirtualCard staff={staff} />

            {staff.bio && (
              <Panel title="Professional bio">
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#d6d1c2]">{staff.bio}</p>
              </Panel>
            )}

            {(staff.skills?.length > 0 || socialEntries.length > 0) && (
              <div className="grid gap-4 lg:grid-cols-2">
                {staff.skills?.length > 0 && (
                  <Panel title="Skills">
                    <div className="flex flex-wrap gap-2">
                      {staff.skills.map((skill, i) => (
                        <span
                          key={`${skill}-${i}`}
                          className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-3 py-1 text-xs font-semibold text-[#e8c95a]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </Panel>
                )}

                {socialEntries.length > 0 && (
                  <Panel title="Connect">
                    <div className="flex flex-wrap gap-2">
                      {socialEntries.map(([platform, url]) => {
                        const Icon = SOCIAL_ICONS[String(platform).toLowerCase()] || Globe;
                        return (
                          <a
                            key={platform}
                            href={String(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold capitalize text-[#d6d1c2] transition hover:border-[#d4af37]/40 hover:text-[#e8c95a]"
                          >
                            <Icon className="h-4 w-4" /> {platform}
                          </a>
                        );
                      })}
                    </div>
                  </Panel>
                )}
              </div>
            )}

            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8577]">Questions about this profile?</p>
                <p className="mt-1 text-sm text-[#c9c4b4]">Contact the TradingBible people team.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="mailto:support@tradingbible.app"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4af37]/25 px-3.5 py-2 text-sm font-semibold text-[#e8c95a] transition hover:bg-[#d4af37]/10"
                >
                  <Mail className="h-4 w-4" /> support@tradingbible.app
                </a>
                <a
                  href="/"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-semibold text-[#c9c4b4] transition hover:bg-white/5 hover:text-[#e8c95a]"
                >
                  <Globe className="h-4 w-4" /> tradingbible.app
                </a>
              </div>
            </section>

            <p className="pb-3 text-center text-[11px] leading-relaxed text-[#5c584c]">
              This digital card opens from the QR code on a TradingBible LLC employee ID.
              “Verified staff” has been confirmed by TradingBible administration.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
