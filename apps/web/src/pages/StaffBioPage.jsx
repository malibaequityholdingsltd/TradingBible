import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BadgeCheck, Building2, Calendar, Facebook, Fingerprint, Github, Globe, Instagram,
  Linkedin, Mail, MapPin, Shield, Twitter, Youtube,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
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
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
        if (!res.ok) throw new Error(data?.error === 'staff profile not found' ? 'This staff profile was not found.' : `Could not load profile (${res.status})`);
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

  return (
    <div className="min-h-screen bg-[#08080d] text-[#f0ecdd]">
      {/* soft background glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-[#d4af37]/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#3b82f6]/[0.05] blur-[100px]" />
      </div>

      <header className="relative z-10 border-b border-white/[0.06] bg-black/25 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <BrandLogo size={30} />
            <span className="text-lg font-extrabold tracking-tight">
              Trading<span className="text-[#d4af37]">Bible</span>
            </span>
          </a>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8577]">
            <Shield className="h-3.5 w-3.5 text-[#d4af37]" /> Staff Profile
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {loading && (
          <div className="grid min-h-[50vh] place-items-center">
            <div className="flex items-center gap-3 text-[#8a8577]">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#d4af37]/40 border-t-[#d4af37]" />
              Loading staff profile…
            </div>
          </div>
        )}

        {!loading && (error || !staff) && (
          <div className="mx-auto max-w-md rounded-3xl border border-[#d4af37]/15 bg-white/[0.02] p-10 text-center">
            <Shield className="mx-auto h-12 w-12 text-[#d4af37]/40" />
            <h2 className="mt-4 text-xl font-bold">Profile unavailable</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">
              {error || 'This staff member does not have a public profile.'} If you scanned a printed ID card, ask the card holder to have their
              profile completed in the admin portal.
            </p>
          </div>
        )}

        {!loading && staff && (
          <div className="space-y-5">
            {/* identity */}
            <section className="relative overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-gradient-to-br from-[#141309] via-[#0d0d13] to-[#0a0a10] p-6 sm:p-8">
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#d4af37]/12 blur-[100px]" />
              <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
                <div className="relative shrink-0">
                  <div className="h-32 w-28 overflow-hidden rounded-2xl border-2 border-[#d4af37]/35 bg-[#e9e2cf] sm:h-36 sm:w-32">
                    {staff.photoUrl ? (
                      <img src={staff.photoUrl} alt={staff.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-4xl font-extrabold text-[#948d7a]">
                        {(staff.name || 'TB').trim().charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {staff.verified && (
                    <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full bg-emerald-400 ring-4 ring-[#0d0d13]">
                      <BadgeCheck className="h-4 w-4 text-[#0a0a0f]" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{staff.name}</h1>
                    {staff.verified && (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                        Verified staff
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-lg font-semibold text-[#d4af37]">{staff.title}</p>
                  <p className="mt-0.5 text-sm text-[#8a8577]">{staff.department ? `${staff.department} · ` : ''}TradingBible LLC</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[#c9c4b4] sm:justify-start">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-[#d4af37]" /> Delaware, USA
                    </span>
                    {staff.employeeId && (
                      <span className="inline-flex items-center gap-1.5">
                        <Fingerprint className="h-4 w-4 text-[#d4af37]" /> <span className="font-mono">{staff.employeeId}</span>
                      </span>
                    )}
                    {staff.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-[#d4af37]" /> {staff.location}
                      </span>
                    )}
                    {staff.startDate && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-[#d4af37]" /> Since {fmtDate(staff.startDate)}
                      </span>
                    )}
                  </div>
                  {staff.workEmail && (
                    <a
                      href={`mailto:${staff.workEmail}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-3.5 py-2 text-sm font-medium text-[#e8c95a] transition hover:border-[#d4af37]/50 hover:bg-[#d4af37]/[0.1]"
                    >
                      <Mail className="h-4 w-4" /> {staff.workEmail}
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* bio */}
            {staff.bio && (
              <section className="glass rounded-3xl border border-[#d4af37]/15 p-6 sm:p-7">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8a8577]">Professional bio</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-[#d6d1c2]">{staff.bio}</p>
              </section>
            )}

            {/* skills */}
            {staff.skills?.length > 0 && (
              <section className="glass rounded-3xl border border-[#d4af37]/15 p-6 sm:p-7">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8a8577]">Skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {staff.skills.map((s, i) => (
                    <span key={i} className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-3 py-1 text-xs font-semibold text-[#e8c95a]">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* socials */}
            {socials && Object.keys(socials).length > 0 && (
              <section className="glass rounded-3xl border border-[#d4af37]/15 p-6 sm:p-7">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8a8577]">Connect</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(socials).map(([platform, url]) => {
                    if (!url) return null;
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
              </section>
            )}

            {/* company contact */}
            <section className="glass rounded-3xl border border-[#d4af37]/15 p-6 text-center sm:p-7">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a8577]">Questions about this profile?</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
                <a href="mailto:support@tradingbible.app" className="inline-flex items-center gap-1.5 font-medium text-[#e8c95a] hover:underline">
                  <Mail className="h-4 w-4" /> support@tradingbible.app
                </a>
                <a href="/" className="inline-flex items-center gap-1.5 font-medium text-[#c9c4b4] hover:text-[#e8c95a]">
                  <Globe className="h-4 w-4" /> tradingbible.app
                </a>
              </div>
            </section>

            <p className="pb-4 text-center text-[11px] leading-relaxed text-[#5c584c]">
              This profile opens from the QR code on a TradingBible LLC employee ID card.
              Identity marked “Verified staff” has been confirmed by TradingBible administration.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
