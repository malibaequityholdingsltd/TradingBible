import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  BadgeCheck, Camera, Check, Eye, Hash, IdCard, Mail, Pencil, Printer,
  QrCode, RefreshCw, Search, ShieldAlert, Users, X,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import StaffIdCard, { companyEmail, employeeNo, publicBioUrl } from '@/components/StaffIdCard';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { isAdminUser } from '@/lib/entitlements';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

/* ── print stylesheet (portal is appended to <body> so print only shows it) ── */
function printCss(paper) {
  const pageRule = paper === 'cr80'
    ? '@page { size: 3.375in 2.125in; margin: 0; }'
    : '@page { size: letter; margin: 0.4in; }';
  const layout = paper === 'cr80'
    ? `.tb-print-portal .tb-print-slot { page-break-after: always; break-after: page; margin: 0 auto; }
       .tb-print-portal .tb-print-slot:last-child { page-break-after: auto; break-after: auto; }`
    : `.tb-print-portal .tb-print-roll { display: flex; flex-wrap: wrap; gap: 16px; }
       .tb-print-portal .tb-print-slot { page-break-inside: avoid; break-inside: avoid; }
       .tb-print-portal .tb-print-break { page-break-after: always; break-after: page; height: 0; }`;
  return `
    .tb-print-portal { display: none; }
    .tb-print-portal, .tb-print-portal * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body > *:not(.tb-print-portal) { display: none !important; }
      .tb-print-portal { display: block !important; }
      ${pageRule}
      ${layout}
      .tb-print-portal .tb-idcard-slot {
        overflow: hidden !important;
        border-radius: 9px !important;
        box-shadow: none !important;
      }
      /* Chrome's print engine can crop the lower half of a transformed card.
         zoom affects layout instead of paint, so the full CR80 card prints. */
      .tb-print-portal .tb-idcard-slot > div {
        transform: none !important;
        zoom: 0.5;
      }
      .tb-print-portal .tb-idcard-slot > div > div,
      .tb-print-portal .tb-idcard-slot > div > div > div {
        overflow: visible !important;
      }
      /* Baked card image — bypasses browser print scaling, font substitution,
         and "background graphics" settings. The image is 2× the print size. */
      .tb-print-portal .tb-print-image {
        width: 324px !important;
        height: 204px !important;
        display: block !important;
        border-radius: 9px;
      }
      ${paper === 'sheet' ? `.tb-print-portal.tb-print-sheet .tb-print-slot {
        outline: 0.6pt dashed rgba(212,175,55,0.9);
        outline-offset: 3px;
      }` : ''}
    }
  `;
}

/* ── photo upload → resized JPEG data URL ──────────────────────────── */
function fileToResizedDataUrl(file, maxW = 360, maxH = 450, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#e9e2cf';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        let out = canvas.toDataURL('image/jpeg', quality);
        if (out.length > 240000) out = canvas.toDataURL('image/jpeg', 0.66);
        resolve(out);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image file'));
    };
    img.src = url;
  });
}

function Stat({ icon: Icon, label, value, tone = '#d4af37' }) {
  return (
    <div className="flex items-center gap-2.5 bg-[#0a0a0f] px-3.5 py-3">
      <Icon className="h-4 w-4 shrink-0" style={{ color: tone }} />
      <div className="min-w-0">
        <div className="font-display text-base font-extrabold leading-none text-[#f0ecdd]">{value}</div>
        <div className="mt-1 truncate text-[10px] uppercase tracking-[0.12em] text-[#8a8577]">{label}</div>
      </div>
    </div>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a8577]">{label}</span>
      <div className="flex rounded-xl border border-[#d4af37]/15 bg-[#0a0a0f] p-0.5" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-[9px] px-3 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
              value === o.value ? 'bg-[#d4af37] text-[#0a0a0f] shadow-sm' : 'text-[#c9c4b4] hover:bg-white/5 hover:text-[#f0ecdd]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── per-staff edit dialog ─────────────────────────────────────────── */
function StaffEditor({ staff, onClose, onSave }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [draft, setDraft] = useState(() => ({
    name: staff.name || '',
    title: staff.title || '',
    photoUrl: staff.photoUrl || '',
    workEmail: staff.workEmail || '',
    employeeId: staff.employeeId || '',
    department: staff.department || '',
    phone: staff.phone || '',
    location: staff.location || '',
    bio: staff.bio || '',
    skills: Array.isArray(staff.skills) ? staff.skills.join(', ') : '',
    linkedin: staff.socials?.linkedin || '',
    twitter: staff.socials?.twitter || staff.socials?.x || '',
    github: staff.socials?.github || '',
    website: staff.socials?.website || '',
    emergencyName: staff.emergencyContact?.name || '',
    emergencyPhone: staff.emergencyContact?.phone || '',
    verified: Boolean(staff.verified),
  }));
  const [saving, setSaving] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusyPhoto(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setDraft((d) => ({ ...d, photoUrl: dataUrl }));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Photo failed', description: String(err?.message || err) });
    } finally {
      setBusyPhoto(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const socials = {
        ...(draft.linkedin.trim() ? { linkedin: draft.linkedin.trim() } : {}),
        ...(draft.twitter.trim() ? { twitter: draft.twitter.trim() } : {}),
        ...(draft.github.trim() ? { github: draft.github.trim() } : {}),
        ...(draft.website.trim() ? { website: draft.website.trim() } : {}),
      };
      const saved = await onSave({
        name: draft.name.trim() || null,
        title: draft.title.trim() || null,
        photoUrl: draft.photoUrl.trim() || null,
        workEmail: draft.workEmail.trim() || null,
        employeeId: draft.employeeId.trim() || null,
        department: draft.department.trim() || null,
        phone: draft.phone.trim() || null,
        location: draft.location.trim() || null,
        bio: draft.bio.trim() || null,
        skills: draft.skills.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20),
        socials: Object.keys(socials).length ? socials : null,
        emergencyContact: draft.emergencyName.trim() || draft.emergencyPhone.trim()
          ? { name: draft.emergencyName.trim(), phone: draft.emergencyPhone.trim() }
          : null,
        verified: draft.verified,
      });
      const linked = saved?.linked !== false;
      toast({
        title: 'Card profile saved',
        description: linked
          ? `${draft.name.trim() || staff.name} — printed card and public profile updated`
          : `${draft.name.trim() || staff.name} — saved to the application; it will link automatically when this employee signs in.`,
      });
      onClose();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: String(err?.message || err) });
    } finally {
      setSaving(false);
    }
  };

  const previewStaff = { ...staff, ...draft };

  return createPortal(
    <div className="tb-idc fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true">
      <div className="glass w-full max-w-2xl rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#f0ecdd]">Edit ID card — {staff.name}</h3>
            <p className="mt-1 text-xs text-[#8a8577]">Changes apply to the printed card and the public profile QR opens.</p>
            {!staff.userId && (
              <p className="mt-2 inline-flex max-w-lg items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-300">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This employee has no login yet. Card details save to the application now and link automatically when they sign in.
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/10 p-2 text-[#8a8577] hover:text-[#f0ecdd]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[240px_1fr]">
          {/* photo column */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Staff photo</div>
            <div className="mt-2 flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-[#0f0f14]/60 p-3">
              <div className="h-[150px] w-[118px] overflow-hidden rounded-lg border border-white/10 bg-[#e9e2cf]">
                {draft.photoUrl ? (
                  <img src={draft.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-3xl font-extrabold text-[#948d7a]">
                    {(staff.name || 'TB').trim().charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busyPhoto}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#d4af37]/30 px-2 py-1.5 text-xs font-semibold text-[#d4af37] hover:bg-[#d4af37]/10 disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" /> {busyPhoto ? 'Processing…' : 'Upload'}
                </button>
                {draft.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, photoUrl: '' }))}
                    className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-[#8a8577] hover:text-red-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
              <input
                value={draft.photoUrl.startsWith('data:') ? '' : draft.photoUrl}
                onChange={set('photoUrl')}
                placeholder="…or paste an image URL"
                className="w-full rounded-lg border border-white/10 bg-[#0f0f14] px-2.5 py-1.5 text-xs text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50"
              />
            </div>

            <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Live preview</div>
            <div className="mt-2 overflow-hidden rounded-xl">
              <StaffIdCard staff={previewStaff} side="front" scale={0.34} />
            </div>

            <div className="mt-3 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.05] p-3">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#8a8577]">
                <QrCode className="h-3 w-3 text-[#d4af37]" /> QR destination
              </div>
              <a
                href={publicBioUrl(staff)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-[11px] font-semibold leading-relaxed text-[#d4af37] hover:underline"
              >
                {publicBioUrl(staff)}
              </a>
              <p className="mt-1 text-[10px] leading-relaxed text-[#8a8577]">
                Scanning the printed card opens this exact employee profile.
              </p>
            </div>
          </div>

          {/* fields column */}
          <div className="space-y-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Full name</span>
                <input value={draft.name} onChange={set('name')} placeholder="Full name" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Job title</span>
                <input value={draft.title} onChange={set('title')} placeholder="e.g. Senior Trading Analyst" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Company email</span>
                <input value={draft.workEmail} onChange={set('workEmail')} placeholder={companyEmail(staff)} className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Employee ID</span>
                <input value={draft.employeeId} onChange={set('employeeId')} placeholder={employeeNo(staff)} className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Department</span>
                <input value={draft.department} onChange={set('department')} placeholder="e.g. Trading, Support" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Phone</span>
                <input value={draft.phone} onChange={set('phone')} placeholder="+1 …" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
              </label>
            </div>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Location</span>
              <input value={draft.location} onChange={set('location')} placeholder="City, Country — or Remote" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Skills (comma separated)</span>
              <input value={draft.skills} onChange={set('skills')} placeholder="Technical Analysis, Risk Management, Python" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Bio (shown on the scanned profile)</span>
              <textarea value={draft.bio} onChange={set('bio')} rows={4} placeholder="Short professional bio…" className="mt-1.5 w-full resize-y rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
            </label>
            <div className="rounded-xl border border-white/10 p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Socials (shown on the scanned profile)</div>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                <input value={draft.linkedin} onChange={set('linkedin')} placeholder="LinkedIn URL" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
                <input value={draft.twitter} onChange={set('twitter')} placeholder="X / Twitter URL" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
                <input value={draft.github} onChange={set('github')} placeholder="GitHub URL" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
                <input value={draft.website} onChange={set('website')} placeholder="Website URL" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Emergency contact (printed on card back)</div>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                <input value={draft.emergencyName} onChange={set('emergencyName')} placeholder="Contact name" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
                <input value={draft.emergencyPhone} onChange={set('emergencyPhone')} placeholder="Contact phone" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50" />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 p-3.5">
              <input
                type="checkbox"
                checked={draft.verified}
                onChange={(e) => setDraft((d) => ({ ...d, verified: e.target.checked }))}
                className="h-4 w-4 accent-[#d4af37]"
              />
              <span className="text-sm text-[#c9c4b4]">
                Mark as <span className="font-semibold text-emerald-300">verified staff</span> — shows a verified badge on the public profile.
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#c9c4b4] hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2 text-sm font-bold text-[#0a0a0f] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Save card'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── console (all hooks live here, behind the admin guard) ─────────── */
function CardsConsole() {
  const { toast } = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [printSide, setPrintSide] = useState('both');
  const [paper, setPaper] = useState('cr80');
  const [editing, setEditing] = useState(null);
  const [printImages, setPrintImages] = useState(null);
  const [preparingPrint, setPreparingPrint] = useState(false);
  const captureHostRef = useRef(null);
  const captureRefs = useRef(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/jobs/payroll`, {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      const list = Array.isArray(data) ? data : [];
      setStaff(list);
      setSelected(new Set(list.map((s) => s.id || s.appId)));
      // Register (persist) an employee number for anyone hired before
      // numbers existed — the printed number then never changes again.
      const missing = list.filter((s) => !s.employeeId);
      if (missing.length) {
        const updates = new Map();
        await Promise.all(missing.map(async (s) => {
          const sid = s.id || s.appId;
          const empNo = employeeNo(s);
          try {
            const r = await fetch(`${API_SERVER_URL}/admin/jobs/staff/${encodeURIComponent(sid)}/card`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
              body: JSON.stringify({ employeeId: empNo }),
            });
            if (r.ok) updates.set(sid, empNo);
          } catch { /* card still shows the derived number */ }
        }));
        if (updates.size) {
          setStaff((prev) => prev.map((s) => (updates.has(s.id || s.appId) ? { ...s, employeeId: updates.get(s.id || s.appId) } : s)));
          toast({ title: 'Employee numbers registered', description: `Stored ${updates.size} new number${updates.size === 1 ? '' : 's'} on the staff records.` });
        }
      }
    } catch (err) {
      setStaff([]);
      toast({ variant: 'destructive', title: 'Staff roster failed to load', description: String(err?.message || err) });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return staff;
    return staff.filter((s) => [s.name, s.email, s.title, s.department, s.workEmail, s.location]
      .some((v) => String(v || '').toLowerCase().includes(needle)));
  }, [staff, q]);

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const allShownSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id || s.appId));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allShownSelected) filtered.forEach((s) => next.delete(s.id || s.appId));
    else filtered.forEach((s) => next.add(s.id || s.appId));
    return next;
  });

  const selectedStaff = useMemo(() => staff.filter((s) => selected.has(s.id || s.appId)), [staff, selected]);

  // Cards are rasterized at 2× before printing. The print sheet then contains
  // plain images instead of live CSS, so it cannot reflow, drop the dark
  // background, or substitute fonts in the browser's print dialog.
  const captureJobs = useMemo(() => {
    const fronts = [];
    const backs = [];
    selectedStaff.forEach((s) => {
      const id = s.id || s.appId;
      if (printSide !== 'back') fronts.push({ key: `front-${id}`, side: 'front', staff: s });
      if (printSide !== 'front') backs.push({ key: `back-${id}`, side: 'back', staff: s });
    });
    return [...fronts, ...backs];
  }, [selectedStaff, printSide]);

  useEffect(() => {
    setPrintImages(null);
  }, [selectedStaff, printSide, paper]);

  const collectImages = async (root) => {
    if (!root) return;
    const images = [...root.querySelectorAll('img')];
    await Promise.all(images.map((img) => {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
  };

  const handlePrint = async () => {
    if (!selectedStaff.length || preparingPrint) return;
    setPreparingPrint(true);
    setPrintImages(null);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await collectImages(captureHostRef.current);
      // Give a failed logo a beat to swap to its inline fallback before capture.
      await new Promise((resolve) => setTimeout(resolve, 120));
      const images = [];
      for (const job of captureJobs) {
        const node = captureRefs.current.get(job.key);
        if (!node) continue;
        const src = await toPng(node, {
          width: 648,
          height: 408,
          pixelRatio: 2,
          cacheBust: false,
          backgroundColor: '#0b0b12',
          style: { transform: 'none' },
        });
        images.push({ key: job.key, side: job.side, src });
      }
      if (!images.length) throw new Error('No cards were ready to print.');
      setPrintImages(images);
      // Let React render the baked images, then wait for the data URLs to decode.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const printNodes = [...document.querySelectorAll('.tb-print-portal img.tb-print-image')];
      await Promise.all(printNodes.map((img) => (
        img.complete ? Promise.resolve() : new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        })
      )));
      await new Promise((resolve) => setTimeout(resolve, 120));
      window.print();
    } catch (err) {
      console.error('[print cards]', err);
      toast({
        variant: 'destructive',
        title: 'Could not prepare the print sheet',
        description: String(err?.message || err),
      });
    } finally {
      setPreparingPrint(false);
    }
  };

  const withPhoto = staff.filter((s) => Boolean(s.photoUrl)).length;
  const emailsSet = staff.filter((s) => Boolean(s.workEmail)).length;
  const numbersSet = staff.filter((s) => Boolean(s.employeeId)).length;

  const printSideLabel = printSide === 'both' ? 'fronts + backs' : printSide === 'front' ? 'fronts only' : 'backs only';
  const printPaperLabel = paper === 'cr80' ? 'CR80 cards · one per page' : 'Letter sheets · cut out';
  const printPages = paper === 'cr80'
    ? selectedStaff.length * (printSide === 'both' ? 2 : 1)
    : (printSide === 'both' ? 2 : 1);
  const printOutput = paper === 'cr80'
    ? `${printPages} card page${printPages === 1 ? '' : 's'}`
    : `${printPages} sheet side${printPages === 1 ? '' : 's'}`;
  const hasPrintImages = Boolean(printImages?.length);
  const printFrontImages = printImages?.filter((img) => img.side === 'front') || [];
  const printBackImages = printImages?.filter((img) => img.side === 'back') || [];

  const saveCard = async (id, patch) => {
    const res = await fetch(`${API_SERVER_URL}/admin/jobs/staff/${encodeURIComponent(id)}/card`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`);
    const saved = data?.staff && typeof data.staff === 'object' ? data.staff : patch;
    setStaff((prev) => prev.map((s) => {
      if ((s.id || s.appId) !== id) return s;
      return {
        ...s,
        ...patch,
        ...saved,
        name: patch.name || s.name, // API keeps the old name on blank
        photoUrl: saved.photoUrl !== undefined ? (saved.photoUrl || null) : s.photoUrl,
      };
    }));
    return data;
  };

  return (
    <AdminLayout title="ID Cards">
      <div className="tb-idc space-y-5">
        {/* masthead */}
        <section className="tb-idc-hero relative overflow-hidden rounded-2xl border border-[#d4af37]/20">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#d4af37]/[0.13] blur-[100px]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#3b82f6]/[0.06] blur-[90px]" />
          <div className="relative px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
            <div className="flex flex-wrap items-center justify-end gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/admin/employees"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-[#c9c4b4] hover:bg-white/5"
                >
                  <Users className="h-4 w-4" /> Employees
                </Link>
                <button
                  onClick={load}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4af37]/30 px-3.5 py-2 text-xs font-semibold text-[#d4af37] hover:bg-[#d4af37]/10 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#d4af37]/15 bg-white/[0.06] sm:grid-cols-4">
              <Stat icon={Users} label="Hired staff" value={staff.length} />
              <Stat icon={Camera} label="Photos ready" value={`${withPhoto}/${staff.length || 0}`} tone="#34d399" />
              <Stat icon={Mail} label="Emails set" value={`${emailsSet}/${staff.length || 0}`} tone="#38bdf8" />
              <Stat icon={Hash} label="Employee #s" value={`${numbersSet}/${staff.length || 0}`} tone="#d4af37" />
            </div>
          </div>
        </section>

        {/* print studio toolbar */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8577]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search staff, email or title…"
                className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] py-2 pl-9 pr-3 text-sm text-[#f0ecdd] outline-none placeholder:text-[#8a8577] focus:border-[#d4af37]/50"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d4af37]/15 bg-[#0a0a0f] px-3 py-2 text-xs font-semibold text-[#c9c4b4]">
              <input type="checkbox" checked={allShownSelected} onChange={toggleAll} className="h-4 w-4 accent-[#d4af37]" />
              Select all
            </label>
            <button
              onClick={handlePrint}
              disabled={selectedStaff.length === 0 || preparingPrint}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> {preparingPrint ? 'Preparing…' : 'Print cards'}
              {selectedStaff.length > 0 && (
                <span className="rounded-md bg-black/15 px-1.5 py-0.5 font-mono text-[11px] font-extrabold">{selectedStaff.length}</span>
              )}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/[0.06] pt-3">
            <Segmented
              label="Sides"
              value={printSide}
              onChange={setPrintSide}
              options={[
                { value: 'both', label: 'Front + back' },
                { value: 'front', label: 'Front only' },
                { value: 'back', label: 'Back only' },
              ]}
            />
            <Segmented
              label="Paper"
              value={paper}
              onChange={setPaper}
              options={[
                { value: 'cr80', label: 'CR80 card' },
                { value: 'sheet', label: 'Letter sheet' },
              ]}
            />
            <span className="ml-auto text-[11px] text-[#8a8577]">
              <span className="font-mono text-[#d4af37]">{selected.size}</span> of <span className="font-mono">{staff.length}</span> selected
            </span>
          </div>
          <div className="mt-2.5 flex items-start gap-1.5 border-t border-white/[0.06] pt-2.5 text-[11px] leading-relaxed text-[#8a8577]">
            <Printer className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />
            <span>
              {selectedStaff.length > 0
                ? <>Will print <span className="font-semibold text-[#c9c4b4]">{selectedStaff.length}</span> {selectedStaff.length === 1 ? 'card' : 'cards'} — {printSideLabel} · {printPaperLabel} · <span className="font-semibold text-[#c9c4b4]">{printOutput}</span>.</>
                : 'Select at least one staff member to print.'}
            </span>
          </div>
        </section>

        {/* roster */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a8577]">
            Roster previews <span className="mx-1 text-[#6a665a]">·</span> {filtered.length}
          </h2>
          <span className="hidden text-[9px] uppercase tracking-[0.16em] text-[#8a8577] sm:block">Front &amp; back · print-ready layout</span>
        </div>

        {loading ? (
          <div className="grid min-h-[280px] place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.015]">
            <div className="flex items-center gap-2 text-[#8a8577]">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#d4af37]/40 border-t-[#d4af37]" />
              Loading staff roster…
            </div>
          </div>
        ) : staff.length === 0 ? (
          <div className="grid min-h-[240px] place-items-center rounded-2xl border border-dashed border-[#d4af37]/20 bg-white/[0.01] px-6 text-center">
            <div>
              <IdCard className="mx-auto h-9 w-9 text-[#d4af37]/50" />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8a8577]">
                No hired staff yet — hire from <span className="font-semibold text-[#d4af37]">Jobs &amp; Hiring</span> and the ID card appears here automatically.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid min-h-[180px] place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.015] px-6 text-center text-sm text-[#8a8577]">
            No staff match “{q}”.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const id = s.id || s.appId;
              const isSelected = selected.has(id);
              const initials = String(s.name || 'TB').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'TB';
              return (
                <article
                  key={id}
                  className={`group relative overflow-hidden rounded-2xl border transition ${
                    isSelected
                      ? 'border-[#d4af37]/40 bg-[#d4af37]/5'
                      : 'border-white/[0.07] bg-white/[0.015] hover:border-[#d4af37]/25'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute inset-y-0 left-0 w-[3px] transition ${isSelected ? 'bg-[#d4af37]' : 'bg-transparent group-hover:bg-[#d4af37]/30'}`}
                  />
                  <div className="grid gap-5 p-4 pl-5 sm:p-5 sm:pl-6 xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] xl:items-center">
                    {/* identity rail */}
                    <div className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(id)}
                        className="mt-1.5 h-4 w-4 shrink-0 accent-[#d4af37]"
                        aria-label={`Select ${s.name}`}
                      />
                      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#d4af37]/25 bg-[#e9e2cf] font-display text-lg font-extrabold text-[#8a8270]">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="truncate text-[15px] font-bold leading-tight text-[#f0ecdd]">{s.name || 'Staff Member'}</h3>
                          {s.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" />}
                          {!s.photoUrl && (
                            <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-300">
                              Photo needed
                            </span>
                          )}
                          {!s.userId && (
                            <span
                              className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-300"
                              title="No login yet — card details are stored on the application until this employee signs in."
                            >
                              No login yet
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-[#d4af37]">{s.title || 'Opening'}</p>
                        <p className="mt-1 truncate font-mono text-[11px] text-[#c9c4b4]">{employeeNo(s)}</p>
                        <p className="truncate font-mono text-[11px] text-[#8a8577]">{companyEmail(s)}</p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setEditing(s)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-[#d4af37] hover:bg-[#d4af37]/[0.13]"
                          >
                            <Pencil className="h-3 w-3" /> Edit card
                          </button>
                          <a
                            href={publicBioUrl(s)}
                            target="_blank"
                            rel="noreferrer"
                            title={publicBioUrl(s)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#c9c4b4] hover:bg-white/5"
                          >
                            <Eye className="h-3 w-3" /> Public bio
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* front + back previews */}
                    <div className="flex flex-wrap items-center justify-center gap-4 xl:justify-end">
                      {['front', 'back'].map((side) => (
                        <figure key={side} className="text-center">
                          <StaffIdCard staff={s} side={side} scale={0.42} />
                          <figcaption className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#8a8577]">{side}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* print guide */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a8577]">
              <Printer className="h-3.5 w-3.5 text-[#d4af37]" /> Print guide
            </h2>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">100% scale · margins none · card image baked</span>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            {[
              { n: '01', t: 'Card printer (CR80)', d: 'Set Paper to “CR80 card”, Sides to “Front only”, Margins to “None”, and scale to 100%. Print, reload the cards, then print “Back only”. The app bakes each card into the print sheet so it matches the preview.' },
              { n: '02', t: 'Office printer', d: 'Set Paper to “Letter sheet” and print at 100% scale. Cut along the gold dashed outlines; cards come out at true physical size (3.375" × 2.125"). Do not use “Fit to page”.' },
              { n: '03', t: 'Browser dialog', d: 'Use the “Print cards” button — not Cmd/Ctrl+P — so the baked card image is used. Set Margins to “None” for CR80 (Default for Letter) and disable “Fit to page”. Background graphics can stay off; the black-and-gold design is baked in.' },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <span className="font-display text-lg font-extrabold leading-none text-[#d4af37]/45 tabular-nums">{step.n}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#f0ecdd]">{step.t}</div>
                  <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {editing && (
        <StaffEditor staff={editing} onClose={() => setEditing(null)} onSave={(patch) => saveCard(editing.id || editing.appId, patch)} />
      )}

      {/* print-only portal — appended to <body>, everything else hidden in print */}
      {typeof document !== 'undefined' && createPortal(
        <div className={`tb-print-portal tb-print-${paper}`} aria-hidden="true">
          <style>{printCss(paper)}</style>
          {paper === 'sheet' ? (
            <>
              {printSide !== 'back' && (
                <>
                  <div className="tb-print-roll">
                    {hasPrintImages
                      ? printFrontImages.map((img) => (
                        <img key={img.key} src={img.src} alt="" className="tb-print-slot tb-print-image" />
                      ))
                      : selectedStaff.map((s) => (
                        <StaffIdCard key={`sf-${s.id || s.appId}`} staff={s} side="front" scale={0.5} className="tb-print-slot" />
                      ))}
                  </div>
                  {printSide === 'both' && <div className="tb-print-break" />}
                </>
              )}
              {printSide !== 'front' && (
                <div className="tb-print-roll">
                  {hasPrintImages
                    ? printBackImages.map((img) => (
                      <img key={img.key} src={img.src} alt="" className="tb-print-slot tb-print-image" />
                    ))
                    : selectedStaff.map((s) => (
                      <StaffIdCard key={`sb-${s.id || s.appId}`} staff={s} side="back" scale={0.5} className="tb-print-slot" />
                    ))}
                </div>
              )}
            </>
          ) : hasPrintImages ? (
            printImages.map((img) => (
              <img key={img.key} src={img.src} alt="" className="tb-print-slot tb-print-image" />
            ))
          ) : (
            <>
              {printSide !== 'back' && selectedStaff.map((s) => (
                <StaffIdCard key={`pf-${s.id || s.appId}`} staff={s} side="front" scale={0.5} className="tb-print-slot" />
              ))}
              {printSide !== 'front' && selectedStaff.map((s) => (
                <StaffIdCard key={`pb-${s.id || s.appId}`} staff={s} side="back" scale={0.5} className="tb-print-slot" />
              ))}
            </>
          )}
        </div>,
        document.body,
      )}

      {/* Off-screen 1× card renderer — captured to PNG before printing so the
          print sheet matches the on-page preview exactly. */}
      {typeof document !== 'undefined' && createPortal(
        <div
          ref={captureHostRef}
          aria-hidden="true"
          style={{ position: 'fixed', left: -10000, top: 0, width: 648, pointerEvents: 'none', zIndex: -1 }}
        >
          {captureJobs.map((job) => (
            <div
              key={job.key}
              ref={(el) => {
                if (el) captureRefs.current.set(job.key, el);
                else captureRefs.current.delete(job.key);
              }}
              data-capture={job.key}
              style={{ width: 648, height: 408 }}
            >
              <StaffIdCard staff={job.staff} side={job.side} scale={1} />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </AdminLayout>
  );
}

export default function StaffIdCardsPage() {
  const { user } = useAuth();
  if (!isAdminUser(user)) {
    return (
      <AdminLayout title="ID Cards">
        <div className="grid min-h-[60vh] place-items-center px-6 text-center">
          <div>
            <h2 className="text-xl font-semibold text-[#f0ecdd]">Admin access required</h2>
            <p className="mt-2 text-sm text-[#8a8577]">Sign in with an administrator account to manage ID cards.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }
  return <CardsConsole />;
}
