import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  BadgeCheck, Camera, Check, ChevronLeft, Eye, Hash, Mail, Pencil, Printer,
  RefreshCw, Search, Users, X,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import StaffIdCard, { companyEmail, employeeNo } from '@/components/StaffIdCard';
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
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body > *:not(.tb-print-portal) { display: none !important; }
      .tb-print-portal { display: block !important; }
      ${pageRule}
      ${layout}
      .tb-print-portal .tb-idcard-slot { box-shadow: none !important; }
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

function Tile({ icon: Icon, label, value, tone = '#d4af37' }) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl border border-white/[0.06] p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-lg font-extrabold leading-tight text-[#f0ecdd]">{value}</div>
        <div className="truncate text-[11px] uppercase tracking-[0.12em] text-[#8a8577]">{label}</div>
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
      await onSave({
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
      toast({ title: 'Card profile saved', description: `${draft.name.trim() || staff.name} — ID card updated` });
      onClose();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: String(err?.message || err) });
    } finally {
      setSaving(false);
    }
  };

  const previewStaff = { ...staff, ...draft };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true">
      <div className="glass w-full max-w-2xl rounded-2xl border border-[#d4af37]/25 bg-[#0d0d13] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#f0ecdd]">Edit ID card — {staff.name}</h3>
            <p className="mt-1 text-xs text-[#8a8577]">Changes apply to the printed card and the public profile QR opens.</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/10 p-2 text-[#8a8577] hover:text-[#f0ecdd]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[240px_1fr]">
          {/* photo column */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Staff photo</div>
            <div className="mt-2 flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
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
                className="w-full rounded-lg border border-white/10 bg-[#0f0f14] px-2.5 py-1.5 text-xs text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50"
              />
            </div>

            <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Live preview</div>
            <div className="mt-2 overflow-hidden rounded-xl">
              <StaffIdCard staff={previewStaff} side="front" scale={0.34} />
            </div>
          </div>

          {/* fields column */}
          <div className="space-y-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Full name</span>
                <input value={draft.name} onChange={set('name')} placeholder="Full name" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Job title</span>
                <input value={draft.title} onChange={set('title')} placeholder="e.g. Senior Trading Analyst" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Company email</span>
                <input value={draft.workEmail} onChange={set('workEmail')} placeholder={companyEmail(staff)} className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Employee ID</span>
                <input value={draft.employeeId} onChange={set('employeeId')} placeholder={employeeNo(staff)} className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Department</span>
                <input value={draft.department} onChange={set('department')} placeholder="e.g. Trading, Support" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Phone</span>
                <input value={draft.phone} onChange={set('phone')} placeholder="+1 …" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
              </label>
            </div>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Location</span>
              <input value={draft.location} onChange={set('location')} placeholder="City, Country — or Remote" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Skills (comma separated)</span>
              <input value={draft.skills} onChange={set('skills')} placeholder="Technical Analysis, Risk Management, Python" className="mt-1.5 w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Bio (shown on the scanned profile)</span>
              <textarea value={draft.bio} onChange={set('bio')} rows={4} placeholder="Short professional bio…" className="mt-1.5 w-full resize-y rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
            </label>
            <div className="rounded-xl border border-white/10 p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Socials (shown on the scanned profile)</div>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                <input value={draft.linkedin} onChange={set('linkedin')} placeholder="LinkedIn URL" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
                <input value={draft.twitter} onChange={set('twitter')} placeholder="X / Twitter URL" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
                <input value={draft.github} onChange={set('github')} placeholder="GitHub URL" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
                <input value={draft.website} onChange={set('website')} placeholder="Website URL" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Emergency contact (printed on card back)</div>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                <input value={draft.emergencyName} onChange={set('emergencyName')} placeholder="Contact name" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
                <input value={draft.emergencyPhone} onChange={set('emergencyPhone')} placeholder="Contact phone" className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50" />
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

  const withPhoto = staff.filter((s) => Boolean(s.photoUrl)).length;
  const emailsSet = staff.filter((s) => Boolean(s.workEmail)).length;
  const numbersSet = staff.filter((s) => Boolean(s.employeeId)).length;

  const saveCard = async (id, patch) => {
    const res = await fetch(`${API_SERVER_URL}/admin/jobs/staff/${encodeURIComponent(id)}/card`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`);
    setStaff((prev) => prev.map((s) => {
      if ((s.id || s.appId) !== id) return s;
      const merged = { ...s, ...patch, photoUrl: patch.photoUrl || null };
      if (!patch.name) merged.name = s.name; // API keeps the old name on blank
      return merged;
    }));
    return data;
  };

  return (
    <AdminLayout title="Employee ID Cards">
      <div className="space-y-5">
        {/* header */}
        <section className="tb-hero overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#d4af37]/15 blur-[110px]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]">
                <Printer className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold tracking-tight text-[#f0ecdd] sm:text-2xl">Employee ID Cards</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#8a8577] sm:text-sm">
                  Driver's-license style cards with scannable QR codes — print CR80 at exact size or on a sheet and cut.
                </p>
              </div>
            </div>
            <Link
              to="/admin/employees"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4af37]/30 px-4 py-2 text-sm font-semibold text-[#d4af37] hover:bg-[#d4af37]/10"
            >
              <ChevronLeft className="h-4 w-4" /> Employees
            </Link>
          </div>
        </section>

        {/* stats */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Tile icon={Users} label="Hired staff" value={staff.length} />
          <Tile icon={Camera} label="Photos ready" value={`${withPhoto}/${staff.length || 0}`} tone="#10b981" />
          <Tile icon={Mail} label="Company emails set" value={`${emailsSet}/${staff.length || 0}`} tone="#38bdf8" />
          <Tile icon={Hash} label="Employee #s registered" value={`${numbersSet}/${staff.length || 0}`} tone="#d4af37" />
        </div>

        {/* toolbar */}
        <div className="glass rounded-2xl border border-[#d4af37]/15 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6a665a]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search staff, email or title…"
                className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] py-2 pl-9 pr-3 text-sm text-[#f0ecdd] outline-none placeholder:text-[#5c584c] focus:border-[#d4af37]/50"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#c9c4b4]">
              <input type="checkbox" checked={allShownSelected} onChange={toggleAll} className="h-4 w-4 accent-[#d4af37]" />
              Select all
            </label>
            <select
              value={printSide}
              onChange={(e) => setPrintSide(e.target.value)}
              className="rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/50"
              aria-label="Which sides to print"
            >
              <option value="both">Print front + back</option>
              <option value="front">Print fronts only</option>
              <option value="back">Print backs only</option>
            </select>
            <select
              value={paper}
              onChange={(e) => setPaper(e.target.value)}
              className="rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] px-3 py-2 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/50"
              aria-label="Print layout"
            >
              <option value="cr80">CR80 card printer</option>
              <option value="sheet">Letter sheet (cut out)</option>
            </select>
            <button
              onClick={() => window.print()}
              disabled={selectedStaff.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2 text-sm font-bold text-[#0a0a0f] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> Print {selectedStaff.length > 0 ? `(${selectedStaff.length})` : ''}
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-[#8a8577]">
            <span>{selected.size} of {staff.length} selected</span>
            <button onClick={load} className="inline-flex items-center gap-1.5 text-[#d4af37] hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh roster
            </button>
          </div>
        </div>

        {/* staff list */}
        {loading ? (
          <div className="grid min-h-[320px] place-items-center">
            <div className="flex items-center gap-2 text-[#8a8577]">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#d4af37]/40 border-t-[#d4af37]" />
              Loading staff roster…
            </div>
          </div>
        ) : staff.length === 0 ? (
          <div className="glass rounded-2xl border border-[#d4af37]/15 p-10 text-center text-[#8a8577]">
            No hired staff yet — hire from <span className="text-[#d4af37]">Jobs &amp; Hiring</span> and their ID card appears here automatically.
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl border border-[#d4af37]/15 p-10 text-center text-[#8a8577]">
            No staff match “{q}”.
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((s) => {
              const id = s.id || s.appId;
              const isSelected = selected.has(id);
              return (
                <article
                  key={id}
                  className={`rounded-2xl border p-4 transition sm:p-5 ${
                    isSelected
                      ? 'border-[#d4af37]/45 bg-[#d4af37]/[0.05]'
                      : 'border-white/[0.06] bg-black/20 hover:border-[#d4af37]/25'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(id)}
                      className="h-4 w-4 accent-[#d4af37]"
                      aria-label={`Select ${s.name}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-[#f0ecdd]">{s.name || 'Staff Member'}</h3>
                        {s.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" />}
                        {!s.photoUrl && (
                          <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            No photo yet
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#8a8577]">
                        <span className="text-[#c9c4b4]">{s.title || 'Opening'}</span>
                        <span className="font-mono">{employeeNo(s)}</span>
                        <span className="font-mono">{companyEmail(s)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(s)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4af37]/30 px-3 py-1.5 text-xs font-semibold text-[#d4af37] hover:bg-[#d4af37]/10"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit card
                      </button>
                      <a
                        href={`/staff/${id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-[#c9c4b4] hover:bg-white/5"
                      >
                        <Eye className="h-3.5 w-3.5" /> Public bio
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-6 xl:justify-start">
                    <figure className="text-center">
                      <StaffIdCard staff={s} side="front" scale={0.58} />
                      <figcaption className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a8577]">Front</figcaption>
                    </figure>
                    <figure className="text-center">
                      <StaffIdCard staff={s} side="back" scale={0.58} />
                      <figcaption className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a8577]">Back</figcaption>
                    </figure>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* print tips */}
        <div className="glass rounded-2xl border border-[#d4af37]/15 p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">
            <Printer className="h-4 w-4 text-[#d4af37]" /> Printing tips
          </h3>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] p-4">
              <div className="mb-1 font-semibold text-[#d4af37]">Card printer (CR80)</div>
              <div className="text-[#c9c4b4]">
                Feed real CR80 cards (3.375" × 2.125"). Print fronts first, reload the cards, then print backs.
              </div>
            </div>
            <div className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] p-4">
              <div className="mb-1 font-semibold text-[#d4af37]">Normal printer</div>
              <div className="text-[#c9c4b4]">
                Choose “Letter sheet”, print at 100% scale, then cut along the card edges. Cards print at true physical size.
              </div>
            </div>
            <div className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] p-4">
              <div className="mb-1 font-semibold text-[#d4af37]">Browser dialog</div>
              <div className="text-[#c9c4b4]">
                Enable “Background graphics” and disable “Fit to page” so the gold security design and colors come through.
              </div>
            </div>
          </div>
        </div>
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
                    {selectedStaff.map((s) => (
                      <StaffIdCard key={`sf-${s.id || s.appId}`} staff={s} side="front" scale={0.5} className="tb-print-slot" />
                    ))}
                  </div>
                  {printSide === 'both' && <div className="tb-print-break" />}
                </>
              )}
              {printSide !== 'front' && (
                <div className="tb-print-roll">
                  {selectedStaff.map((s) => (
                    <StaffIdCard key={`sb-${s.id || s.appId}`} staff={s} side="back" scale={0.5} className="tb-print-slot" />
                  ))}
                </div>
              )}
            </>
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
    </AdminLayout>
  );
}

export default function StaffIdCardsPage() {
  const { user } = useAuth();
  if (!isAdminUser(user)) {
    return (
      <AdminLayout title="Employee ID Cards">
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
