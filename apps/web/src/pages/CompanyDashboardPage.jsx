import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, FileCheck2, GraduationCap, Plus, Trophy } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Link } from 'react-router-dom';

const cardCls = 'glass rounded-2xl p-5';

export default function CompanyDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [classrooms, setClassrooms] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState(user?.companyName || '');
  const [className, setClassName] = useState('');
  const [assessment, setAssessment] = useState({ title: '', type: 'quiz' });

  const load = async () => {
    setLoading(true);
    try {
      const [c, a, cert] = await Promise.all([
        pb.collection('school_classrooms').getFullList({ sort: '-created' }),
        pb.collection('school_assessments').getFullList({ sort: '-created' }),
        pb.collection('school_certificates').getFullList({ sort: '-created' }),
      ]);
      setClassrooms(c);
      setAssessments(a);
      setCerts(cert);
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.dLoadFail'), description: err?.message || t('sch.tTryAgain') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveSchoolProfile = async () => {
    try {
      await pb.collection('users').update(user.id, { accountType: 'company', companyName: schoolName });
      toast({ title: t('sch.dProfileSaved') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.dProfileFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  const addClassroom = async () => {
    if (!className.trim()) return;
    try {
      const rec = await pb.collection('school_classrooms').create({ name: className.trim(), schoolName: schoolName || user?.companyName || 'TradingBible School', studentsCount: 0, teachersCount: 1 });
      setClassrooms((prev) => [rec, ...prev]);
      setClassName('');
      toast({ title: t('sch.dClassAdded') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.dClassFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  const addAssessment = async () => {
    if (!assessment.title.trim()) return;
    try {
      const rec = await pb.collection('school_assessments').create({ title: assessment.title.trim(), type: assessment.type, status: 'draft' });
      setAssessments((prev) => [rec, ...prev]);
      setAssessment({ title: '', type: assessment.type });
      toast({ title: t('sch.dAsCreated', { type: t(`sch.type_${assessment.type}`, null, assessment.type) }) });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.dAsFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  const issueCertificate = async () => {
    try {
      const rec = await pb.collection('school_certificates').create({
        title: t('sch.sampleCert'),
        studentName: t('sch.sampleStudent'),
        issuedAt: new Date().toISOString(),
      });
      setCerts((prev) => [rec, ...prev]);
      toast({ title: t('sch.dCertIssued') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.dCertFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  const summary = useMemo(() => ({
    classrooms: classrooms.length,
    assessments: assessments.length,
    certificates: certs.length,
  }), [classrooms.length, assessments.length, certs.length]);

  return (
    <AppLayout title={t('sch.dTitle')}>
      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <Link to="/company/students" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">{t('sch.dStudents')}</Link>
        <Link to="/company/teachers" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">{t('sch.dTeachers')}</Link>
        <Link to="/company/assessments" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">{t('sch.dExams')}</Link>
        <Link to="/company/submissions" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">{t('sch.dSubs')}</Link>
        <Link to="/company/academy-profiles" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">{t('sch.dAcad')}</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.dClassrooms')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.classrooms}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.dAssessments')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.assessments}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.dCerts')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.certificates}</div></div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><GraduationCap className="h-4 w-4 text-[#d4af37]" /> {t('sch.dSchoolProfile')}</h3>
          <div className="mt-3 flex gap-2">
            <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder={t('sch.dSchoolPh')} className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
            <button onClick={saveSchoolProfile} className="rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f]">{t('sch.dSave')}</button>
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><BookOpen className="h-4 w-4 text-[#d4af37]" /> {t('sch.dClassroomsT')}</h3>
          <div className="mt-3 flex gap-2">
            <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder={t('sch.dClassPh')} className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
            <button onClick={addClassroom} className="inline-flex items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> {t('sch.dAdd')}</button>
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
            {classrooms.slice(0, 5).map((c) => <div key={c.id} className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{c.name}</div>)}
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><FileCheck2 className="h-4 w-4 text-[#d4af37]" /> {t('sch.dTestsT')}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
            <input value={assessment.title} onChange={(e) => setAssessment((prev) => ({ ...prev, title: e.target.value }))} placeholder={t('sch.dAssessPh')} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
            <select value={assessment.type} onChange={(e) => setAssessment((prev) => ({ ...prev, type: e.target.value }))} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#f0ecdd]">
              {['quiz', 'test', 'exam', 'competition'].map((o) => <option key={o} value={o}>{t(`sch.type_${o}`, null, o)}</option>)}
            </select>
            <button onClick={addAssessment} className="rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]">{t('sch.dCreate')}</button>
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
            {assessments.slice(0, 5).map((a) => <div key={a.id} className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{a.title} · <span className="capitalize">{t(`sch.type_${a.type}`, null, a.type)}</span></div>)}
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Award className="h-4 w-4 text-[#d4af37]" /> {t('sch.dCertsT')}</h3>
          <div className="mt-3 flex items-center gap-3 text-sm text-[#8a8577]">
            <button onClick={issueCertificate} className="inline-flex items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-[#d4af37]"><Trophy className="h-4 w-4" /> {t('sch.dIssue')}</button>
            {loading && <span>{t('sch.dSyncing')}</span>}
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
            {certs.slice(0, 5).map((c) => <div key={c.id} className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{c.title} · {c.studentName || t('sch.dStudentFb')}</div>)}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
