import React, { useEffect, useMemo, useState } from 'react';
import { Award, FileCheck2, GraduationCap, Trophy, Users } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { getDunsStatus, verifyDuns, matchDuns } from '@/lib/duns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { CompanyNav } from './CompanySchoolPages';

const cardCls = 'glass rounded-2xl p-5';

export default function CompanyDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [certs, setCerts] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [academyCount, setAcademyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState(user?.companyName || '');
  const [certTitle, setCertTitle] = useState('');
  const [certStudent, setCertStudent] = useState('');
  const [duns, setDuns] = useState('');
  const [dunsStatus, setDunsStatus] = useState('unverified');
  const [dunsBusy, setDunsBusy] = useState(false);
  const [dunsProfile, setDunsProfile] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cert, st, tc, sb] = await Promise.all([
        pb.collection('school_certificates').getFullList({ sort: '-created' }),
        pb.collection('school_students').getFullList({ sort: '-created' }).catch(() => []),
        pb.collection('school_teachers').getFullList({ sort: '-created' }).catch(() => []),
        pb.collection('school_submissions').getFullList({ sort: '-submittedAt' }).catch(() => []),
      ]);
      setCerts(cert);
      setStudents(st);
      setTeachers(tc);
      setSubmissions(sb);
      let platformCount = 0;
      try {
        const token = pb.authStore.token;
        if (token) {
          const res = await fetch('/hcgi/api/company/academy-interest', { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) platformCount = (await res.json()).length;
        }
      } catch { /* pipeline count stays local */ }
      setAcademyCount(platformCount + st.filter((s) => s.academyInterest).length);
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.dLoadFail'), description: err?.message || t('sch.tTryAgain') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    getDunsStatus()
      .then((s) => {
        if (s?.dunsNumber) setDuns(s.dunsNumber);
        if (s?.dunsStatus) setDunsStatus(s.dunsStatus);
        if (s?.profile) setDunsProfile(s.profile);
      })
      .catch(() => { /* API unavailable — leave defaults */ });
  }, []);

  const saveSchoolProfile = async () => {
    try {
      await pb.collection('users').update(user.id, { accountType: 'company', companyName: schoolName });
      toast({ title: t('sch.dProfileSaved') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.dProfileFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  const verifyDunsNumber = async () => {
    if (dunsBusy) return;
    setDunsBusy(true);
    try {
      const res = await verifyDuns(duns);
      const next = res?.dunsStatus || 'pending';
      setDunsStatus(next);
      try {
        const s = await getDunsStatus();
        if (s?.profile) setDunsProfile(s.profile);
      } catch { /* keep status only */ }
      toast({ title: next === 'verified' ? t('duns.verified', null, 'DUNS verified') : t('duns.pending', null, 'DUNS submitted — pending live verification') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('duns.failed', null, 'DUNS verification failed'), description: err?.message || t('sch.tTryAgain') });
    } finally {
      setDunsBusy(false);
    }
  };

  const findDunsNumber = async () => {
    if (dunsBusy || !schoolName.trim()) return;
    setDunsBusy(true);
    try {
      const res = await matchDuns({ name: schoolName.trim() });
      const top = res?.candidates?.[0];
      if (top?.duns) {
        setDuns(top.duns);
        toast({ title: t('duns.found', null, 'DUNS found — press Verify to confirm') });
      } else {
        toast({ title: t('duns.noneFound', null, 'No DUNS match yet — enter it manually when yours arrives') });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: t('duns.failed', null, 'DUNS verification failed'), description: err?.message || t('sch.tTryAgain') });
    } finally {
      setDunsBusy(false);
    }
  };
  const summary = useMemo(() => {
    const pending = submissions.filter((s) => s.status !== 'graded').length;
    return {
      students: students.length,
      teachers: teachers.length,
      pending,
      academy: academyCount,
      certificates: certs.length,
    };
  }, [students.length, teachers.length, submissions, academyCount, certs.length]);

  const recentQueue = useMemo(() => submissions.filter((s) => s.status !== 'graded').slice(0, 5), [submissions]);

  const issueCertificate = async () => {
    if (!certTitle.trim() || !certStudent) {
      toast({ variant: 'destructive', title: t('sch.certTitlePh') });
      return;
    }
    try {
      const rec = await pb.collection('school_certificates').create({
        title: certTitle.trim(),
        studentName: certStudent,
        issuedAt: new Date().toISOString(),
      });
      setCerts((prev) => [rec, ...prev]);
      setCertTitle('');
      setCertStudent('');
      toast({ title: t('sch.dCertIssued') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.dCertFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  const delRow = (coll, id, apply) => async () => {
    if (!window.confirm(t('sch.confirmDel'))) return;
    try {
      await pb.collection(coll).delete(id);
      apply();
      toast({ title: t('sch.delete') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTryAgain'), description: err?.message });
    }
  };

  return (
    <AppLayout title={t('sch.dTitle')}>
      <CompanyNav />

      <div className="mb-5 grid gap-3 grid-cols-2 xl:grid-cols-5">
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.dStudents')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.students}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.dTeachers')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.teachers}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.toGrade')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.pending}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.dAcad')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.academy}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.dCerts')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.certificates}</div></div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><GraduationCap className="h-4 w-4 text-[#d4af37]" /> {t('sch.dSchoolProfile')}</h3>
          <div className="mt-3 flex gap-2">
            <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder={t('sch.dSchoolPh')} className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
            <button onClick={saveSchoolProfile} className="rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f]">{t('sch.dSave')}</button>
          </div>
          <div className="mt-3 flex gap-2">
            <input value={duns} onChange={(e) => setDuns(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder={t('duns.number', null, 'DUNS number (9 digits)')} inputMode="numeric" className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
            <button onClick={verifyDunsNumber} disabled={dunsBusy} className="inline-flex items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37] disabled:opacity-60">{dunsStatus === 'verified' ? t('duns.verified', null, 'Verified') : t('duns.verify', null, 'Verify')}</button>
            <button onClick={findDunsNumber} disabled={dunsBusy} title={t('duns.find', null, 'Find my DUNS')} className="inline-flex items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37] disabled:opacity-60">{t('duns.find', null, 'Find')}</button>
          </div>
          {dunsStatus !== 'unverified' && (
            <div className="mt-2 text-xs text-[#8a8577]">{t('duns.status', null, 'DUNS status')}: <span className={dunsStatus === 'verified' ? 'text-emerald-400' : 'text-[#d4af37]'}>{dunsStatus}</span></div>
          )}
          {dunsProfile && (
            <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
              <div className="text-xs uppercase tracking-wider text-[#8a8577]">{t('duns.profile', null, 'Business profile')}{dunsProfile.sandbox ? ` · ${t('duns.sandboxTag', null, 'test data')}` : ''}</div>
              {dunsProfile.primaryName && <div className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{dunsProfile.primaryName}</div>}
              {(dunsProfile.city || dunsProfile.country) && <div className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{[dunsProfile.city, dunsProfile.country].filter(Boolean).join(', ')}</div>}
              {dunsProfile.employeeCount != null && <div className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{t('duns.employees', null, 'Employees')}: {dunsProfile.employeeCount}</div>}
              {dunsProfile.annualRevenue != null && <div className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{t('duns.revenue', null, 'Revenue')}: {dunsProfile.annualRevenue}</div>}
              {dunsProfile.industry && <div className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{t('duns.industry', null, 'Industry')}: {dunsProfile.industry}</div>}
              {dunsProfile.principals?.length > 0 && <div className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{t('duns.principals', null, 'Principals')}: {dunsProfile.principals.map((p) => p.name).join(', ')}</div>}
              {(dunsProfile.failureScore != null || dunsProfile.delinquencyScore != null || dunsProfile.paydex != null) && <div className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{t('duns.risk', null, 'Risk')}: {[dunsProfile.failureScore != null && `failure ${dunsProfile.failureScore}`, dunsProfile.delinquencyScore != null && `delinquency ${dunsProfile.delinquencyScore}`, dunsProfile.paydex != null && `paydex ${dunsProfile.paydex}`].filter(Boolean).join(' · ')}</div>}
            </div>
          )}
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><FileCheck2 className="h-4 w-4 text-[#d4af37]" /> {t('sch.gradeQueue')}</h3>
          <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
            {recentQueue.length === 0 && <div className="text-sm text-[#8a8577]">{t('sch.queueEmpty')}</div>}
            {recentQueue.map((s) => (
              <div key={s.id} className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">
                <span className="truncate">{s.studentName} · {s.assessmentTitle}</span>
              </div>
            ))}
          </div>
          <Link to="/company/submissions" className="mt-3 inline-block text-sm font-semibold text-[#d4af37] hover:underline">{t('sch.dSubs')} →</Link>
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><GraduationCap className="h-4 w-4 text-[#d4af37]" /> {t('sch.dAcad')}</h3>
          <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
            <div className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{t('sch.acadPipeline', null, 'Academy-interested')}: <span className="font-mono text-[#f0ecdd]">{summary.academy}</span></div>
            <div className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{t('sch.dCerts')}: <span className="font-mono text-[#f0ecdd]">{summary.certificates}</span></div>
          </div>
          <Link to="/company/academy-profiles" className="mt-3 inline-block text-sm font-semibold text-[#d4af37] hover:underline">{t('sch.dAcad')} →</Link>
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Award className="h-4 w-4 text-[#d4af37]" /> {t('sch.dCertsT')}</h3>
          <div className="mt-3 grid gap-2">
            <input value={certTitle} onChange={(e) => setCertTitle(e.target.value)} placeholder={t('sch.certTitlePh')} className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
            <div className="flex items-center gap-2">
              <select value={certStudent} onChange={(e) => setCertStudent(e.target.value)} className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#f0ecdd]">
                <option value="">{t('sch.selStudent')}</option>
                {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <button onClick={issueCertificate} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Trophy className="h-4 w-4" /> {t('sch.dIssue')}</button>
            </div>
            {loading && <span className="text-sm text-[#8a8577]">{t('sch.dSyncing')}</span>}
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
            {certs.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">
                <span className="truncate">{c.title} · {c.studentName || t('sch.dStudentFb')}</span>
                <button onClick={delRow('school_certificates', c.id, () => setCerts((prev) => prev.filter((x) => x.id !== c.id)))} className="shrink-0 rounded-lg border border-red-500/35 px-2 py-0.5 text-xs text-red-400">{t('sch.delete')}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
