import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileCheck2, GraduationCap, Plus, User, Users } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

const box = 'glass rounded-2xl p-5';
const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40';

function RoleBanner({ admin, teacher, student }) {
  const { t } = useI18n();
  return (
    <div className="mb-5 grid gap-3 md:grid-cols-3">
      <div className="glass rounded-xl p-3 text-xs leading-relaxed text-[#c9c4b4]"><span className="text-[#d4af37]">{t('sch.roleAdmin')}</span> {admin}</div>
      <div className="glass rounded-xl p-3 text-xs leading-relaxed text-[#c9c4b4]"><span className="text-[#d4af37]">{t('sch.roleTeacher')}</span> {teacher}</div>
      <div className="glass rounded-xl p-3 text-xs leading-relaxed text-[#c9c4b4]"><span className="text-[#d4af37]">{t('sch.roleStudent')}</span> {student}</div>
    </div>
  );
}

function useCompanySchoolData() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState([]);

  const reload = async () => {
    setLoading(true);
    try {
      const [st, tc, as, sb] = await Promise.all([
        pb.collection('school_students').getFullList({ sort: '-created' }),
        pb.collection('school_teachers').getFullList({ sort: '-created' }),
        pb.collection('school_assessments').getFullList({ sort: '-created' }),
        pb.collection('school_submissions').getFullList({ sort: '-submittedAt' }),
      ]);
      setStudents(st);
      setTeachers(tc);
      setAssessments(as);
      setSubmissions(sb);

      let userRows = [];
      try {
        userRows = await pb.collection('users').getFullList({ sort: '-created' });
      } catch {
        const profiles = await pb.collection('profiles').getFullList({ sort: '-created_at' });
        userRows = profiles.map((p) => ({
          ...p,
          role: p.role || p.user_role || 'user',
          username: p.username || (p.email ? p.email.split('@')[0] : 'user'),
          created: p.created || p.created_at || '',
        }));
      }
      setUsers(userRows);
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tLoadFail'), description: err?.message || t('sch.tTryAgain') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);
  return { loading, students, teachers, assessments, submissions, users, setStudents, setTeachers, setAssessments, setSubmissions, reload };
}

export function CompanyStudentsPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { loading, students, setStudents } = useCompanySchoolData();
  const [form, setForm] = useState({ name: '', email: '', classroom: '', academyInterest: true });

  const addStudent = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      const created = await pb.collection('school_students').create({
        name: form.name.trim(),
        email: form.email.trim(),
        classroom: form.classroom.trim() || 'General',
        academyInterest: !!form.academyInterest,
        status: 'active',
      });
      setStudents((prev) => [created, ...prev]);
      setForm({ name: '', email: '', classroom: '', academyInterest: true });
      toast({ title: t('sch.tStAdded') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tStAddFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  return (
    <AppLayout title={t('sch.stTitle')}>
      <RoleBanner
        admin={t('sch.rbStAdmin')}
        teacher={t('sch.rbStTeacher')}
        student={t('sch.rbStStudent')}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Users className="h-4 w-4 text-[#d4af37]" /> {t('sch.addStudent')}</h2>
          <div className="mt-3 space-y-2">
            <input className={input} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={t('sch.namePh')} />
            <input className={input} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder={t('sch.emailPh')} />
            <input className={input} value={form.classroom} onChange={(e) => setForm((p) => ({ ...p, classroom: e.target.value }))} placeholder={t('sch.classPh')} />
            <label className="flex items-center gap-2 text-sm text-[#c9c4b4]">
              <input type="checkbox" checked={form.academyInterest} onChange={(e) => setForm((p) => ({ ...p, academyInterest: e.target.checked }))} className="h-4 w-4 accent-[#d4af37]" />
              {t('sch.acadTrack')}
            </label>
            <button onClick={addStudent} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> {t('sch.saveStudent')}</button>
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">{t('sch.profiles')}</h2>
          <p className="mt-1 text-xs text-[#8a8577]">{t('sch.profilesSub')}</p>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">{t('sch.loading')}</div> : students.length === 0 ? <div className="text-sm text-[#8a8577]">{t('sch.noStudents')}</div> : students.map((s) => (
              <div key={s.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{s.name}</div>
                <div className="text-xs text-[#8a8577]">{s.email} · {s.classroom || t('sch.general')}</div>
                <div className="mt-1 text-xs text-[#c9c4b4]">{s.academyInterest ? t('sch.acadInt') : t('sch.genTrack')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function CompanyTeachersPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { loading, teachers, setTeachers } = useCompanySchoolData();
  const [form, setForm] = useState({ name: '', email: '', subject: '' });

  const addTeacher = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      const created = await pb.collection('school_teachers').create({ ...form, name: form.name.trim(), email: form.email.trim(), subject: form.subject.trim() || t('sch.defaultSubject') });
      setTeachers((prev) => [created, ...prev]);
      setForm({ name: '', email: '', subject: '' });
      toast({ title: t('sch.tTeAdded') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTeAddFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  return (
    <AppLayout title={t('sch.teTitle')}>
      <RoleBanner
        admin={t('sch.rbTeAdmin')}
        teacher={t('sch.rbTeTeacher')}
        student={t('sch.rbTeStudent')}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><GraduationCap className="h-4 w-4 text-[#d4af37]" /> {t('sch.addTeacher')}</h2>
          <div className="mt-3 space-y-2">
            <input className={input} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={t('sch.teNamePh')} />
            <input className={input} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder={t('sch.teEmailPh')} />
            <input className={input} value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder={t('sch.subjPh')} />
            <button onClick={addTeacher} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> {t('sch.saveTeacher')}</button>
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">{t('sch.teDir')}</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">{t('sch.loading')}</div> : teachers.length === 0 ? <div className="text-sm text-[#8a8577]">{t('sch.noTeachers')}</div> : teachers.map((x) => (
              <div key={x.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{x.name}</div>
                <div className="text-xs text-[#8a8577]">{x.email}</div>
                <div className="mt-1 text-xs text-[#c9c4b4]">{x.subject || t('sch.general')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function CompanyAssessmentsPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { loading, assessments, setAssessments } = useCompanySchoolData();
  const [form, setForm] = useState({ title: '', type: 'quiz', instructions: '' });

  const addAssessment = async () => {
    if (!form.title.trim()) return;
    try {
      const created = await pb.collection('school_assessments').create({
        title: form.title.trim(),
        type: form.type,
        status: 'published',
        payload: { instructions: form.instructions },
      });
      setAssessments((prev) => [created, ...prev]);
      setForm({ title: '', type: 'quiz', instructions: '' });
      toast({ title: t('sch.tAsPub', { type: t(`sch.type_${form.type}`, null, form.type) }) });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tAsFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  return (
    <AppLayout title={t('sch.exTitle')}>
      <RoleBanner
        admin={t('sch.rbExAdmin')}
        teacher={t('sch.rbExTeacher')}
        student={t('sch.rbExStudent')}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><BookOpen className="h-4 w-4 text-[#d4af37]" /> {t('sch.createExam')}</h2>
          <div className="mt-3 space-y-2">
            <input className={input} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder={t('sch.asTitlePh')} />
            <select className={input} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
              {['quiz', 'test', 'exam', 'homework'].map((o) => <option key={o} value={o}>{t(`sch.type_${o}`)}</option>)}
            </select>
            <textarea className={`${input} min-h-[120px]`} value={form.instructions} onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))} placeholder={t('sch.instructionsPh')} />
            <button onClick={addAssessment} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> {t('sch.publish')}</button>
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">{t('sch.published')}</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">{t('sch.loading')}</div> : assessments.length === 0 ? <div className="text-sm text-[#8a8577]">{t('sch.noAssess')}</div> : assessments.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{a.title}</div>
                <div className="text-xs text-[#8a8577] capitalize">{t(`sch.type_${a.type}`, null, a.type)} · {t(`sch.st_${a.status || 'draft'}`, null, a.status || 'draft')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function CompanySubmissionsPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { loading, submissions, students, assessments, setSubmissions } = useCompanySchoolData();
  const [form, setForm] = useState({ studentName: '', assessmentTitle: '', type: 'quiz', content: '' });

  const submitForStudent = async () => {
    if (!form.studentName || !form.assessmentTitle || !form.content.trim()) return;
    try {
      const created = await pb.collection('school_submissions').create({
        studentName: form.studentName,
        assessmentTitle: form.assessmentTitle,
        type: form.type,
        content: form.content.trim(),
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      });
      setSubmissions((prev) => [created, ...prev]);
      setForm((prev) => ({ ...prev, content: '' }));
      toast({ title: t('sch.tSuSent') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tSuFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  return (
    <AppLayout title={t('sch.suTitle')}>
      <RoleBanner
        admin={t('sch.rbSuAdmin')}
        teacher={t('sch.rbSuTeacher')}
        student={t('sch.rbSuStudent')}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><FileCheck2 className="h-4 w-4 text-[#d4af37]" /> {t('sch.submitTitle')}</h2>
          <div className="mt-3 space-y-2">
            <select className={input} value={form.studentName} onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))}>
              <option value="">{t('sch.selStudent')}</option>
              {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <select className={input} value={form.assessmentTitle} onChange={(e) => {
              const selected = assessments.find((a) => a.title === e.target.value);
              setForm((p) => ({ ...p, assessmentTitle: e.target.value, type: selected?.type || p.type }));
            }}>
              <option value="">{t('sch.selAssess')}</option>
              {assessments.map((a) => <option key={a.id} value={a.title}>{a.title}</option>)}
            </select>
            <textarea className={`${input} min-h-[140px]`} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder={t('sch.answerPh')} />
            <button onClick={submitForStudent} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> {t('sch.submitNow')}</button>
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">{t('sch.queue')}</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">{t('sch.loading')}</div> : submissions.length === 0 ? <div className="text-sm text-[#8a8577]">{t('sch.noSubs')}</div> : submissions.map((s) => (
              <div key={s.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{s.studentName} · {s.assessmentTitle}</div>
                <div className="text-xs text-[#8a8577] capitalize">{t(`sch.type_${s.type}`, null, s.type)} · {t(`sch.st_${s.status || 'submitted'}`, null, s.status || 'submitted')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function CompanyAcademyProfilesPage() {
  const { t } = useI18n();
  const { loading, users, students } = useCompanySchoolData();
  const academyInterested = useMemo(() => {
    const userMatches = users.filter((u) => {
      const goal = String(u.goal || '').toLowerCase();
      return goal.includes('discipline') || goal.includes('learning') || goal.includes('academy');
    });
    const studentMatches = students.filter((s) => s.academyInterest);
    return { userMatches, studentMatches };
  }, [users, students]);

  return (
    <AppLayout title={t('sch.apTitle')}>
      <RoleBanner
        admin={t('sch.rbApAdmin')}
        teacher={t('sch.rbApTeacher')}
        student={t('sch.rbApStudent')}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><User className="h-4 w-4 text-[#d4af37]" /> {t('sch.intProfiles')}</h2>
          <p className="mt-1 text-xs text-[#8a8577]">{t('sch.intProfilesSub')}</p>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">{t('sch.loading')}</div> : academyInterested.userMatches.length === 0 ? <div className="text-sm text-[#8a8577]">{t('sch.noMatch')}</div> : academyInterested.userMatches.map((u) => (
              <div key={u.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{u.username || u.name || t('sch.userFb')}</div>
                <div className="text-xs text-[#8a8577]">{u.email}</div>
                <div className="mt-1 text-xs text-[#c9c4b4]">{u.goal || t('sch.noGoal')}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Users className="h-4 w-4 text-[#d4af37]" /> {t('sch.schoolList')}</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">{t('sch.loading')}</div> : academyInterested.studentMatches.length === 0 ? <div className="text-sm text-[#8a8577]">{t('sch.noAcadSt')}</div> : academyInterested.studentMatches.map((s) => (
              <div key={s.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{s.name}</div>
                <div className="text-xs text-[#8a8577]">{s.email} · {s.classroom || t('sch.general')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
