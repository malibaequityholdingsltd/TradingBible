import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileCheck2, GraduationCap, Plus, User, Users } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

const box = 'glass rounded-2xl p-5';
const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40';

function RowBtns({ onEdit, onDelete }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 flex gap-2">
      {onEdit && <button onClick={onEdit} className="rounded-lg border border-[#d4af37]/25 px-2.5 py-1 text-xs text-[#d4af37]">{t('sch.edit')}</button>}
      {onDelete && <button onClick={onDelete} className="rounded-lg border border-red-500/35 px-2.5 py-1 text-xs text-red-400">{t('sch.delete')}</button>}
    </div>
  );
}

function confirmDel(t) {
  return window.confirm(t('sch.confirmDel'));
}

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
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => { setForm({ name: '', email: '', classroom: '', academyInterest: true }); setEditingId(null); };

  const saveStudent = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      if (editingId) {
        const updated = await pb.collection('school_students').update(editingId, {
          name: form.name.trim(),
          email: form.email.trim(),
          classroom: form.classroom.trim() || 'General',
          academyInterest: !!form.academyInterest,
        });
        setStudents((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        toast({ title: t('sch.save') });
      } else {
        const created = await pb.collection('school_students').create({
          name: form.name.trim(),
          email: form.email.trim(),
          classroom: form.classroom.trim() || 'General',
          academyInterest: !!form.academyInterest,
          status: 'active',
        });
        setStudents((prev) => [created, ...prev]);
        toast({ title: t('sch.tStAdded') });
      }
      resetForm();
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tStAddFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({ name: s.name || '', email: s.email || '', classroom: s.classroom || '', academyInterest: !!s.academyInterest });
  };

  const delStudent = async (s) => {
    if (!confirmDel(t)) return;
    try {
      await pb.collection('school_students').delete(s.id);
      setStudents((prev) => prev.filter((x) => x.id !== s.id));
      if (editingId === s.id) resetForm();
      toast({ title: t('sch.delete') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTryAgain'), description: err?.message });
    }
  };

  const addStudent = saveStudent;

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
            <button onClick={addStudent} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> {editingId ? t('sch.save') : t('sch.saveStudent')}</button>
            {editingId && <button onClick={resetForm} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-[#8a8577]">{t('sch.cancel')}</button>}
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
                <RowBtns onEdit={() => startEdit(s)} onDelete={() => delStudent(s)} />
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
  const [editingId, setEditingId] = useState(null);
  const [loginMap, setLoginMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const token = pb.authStore.token;
        if (!token) return;
        const res = await fetch('/hcgi/api/company/teachers/status', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const map = {};
        (data.status || []).forEach((s) => { map[String(s.email).toLowerCase()] = !!s.hasLogin; });
        setLoginMap(map);
      } catch { /* badges stay hidden */ }
    })();
  }, []);

  const resetForm = () => { setForm({ name: '', email: '', subject: '' }); setEditingId(null); };

  const saveTeacher = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), subject: form.subject.trim() || t('sch.defaultSubject') };
      if (editingId) {
        const updated = await pb.collection('school_teachers').update(editingId, payload);
        setTeachers((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
        toast({ title: t('sch.save') });
      } else {
        const created = await pb.collection('school_teachers').create(payload);
        setTeachers((prev) => [created, ...prev]);
        toast({ title: t('sch.tTeAdded') });
      }
      resetForm();
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTeAddFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  const addTeacher = saveTeacher;

  const startEdit = (x) => {
    setEditingId(x.id);
    setForm({ name: x.name || '', email: x.email || '', subject: x.subject || '' });
  };

  const delTeacher = async (x) => {
    if (!confirmDel(t)) return;
    try {
      await pb.collection('school_teachers').delete(x.id);
      setTeachers((prev) => prev.filter((y) => y.id !== x.id));
      if (editingId === x.id) resetForm();
      toast({ title: t('sch.delete') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTryAgain'), description: err?.message });
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
            <button onClick={addTeacher} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> {editingId ? t('sch.save') : t('sch.saveTeacher')}</button>
            {editingId && <button onClick={resetForm} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-[#8a8577]">{t('sch.cancel')}</button>}
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">{t('sch.teDir')}</h2>
          <p className="mt-1 text-xs text-[#8a8577]">{t('sch.inviteHint')}</p>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">{t('sch.loading')}</div> : teachers.length === 0 ? <div className="text-sm text-[#8a8577]">{t('sch.noTeachers')}</div> : teachers.map((x) => (
              <div key={x.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-[#f0ecdd]">{x.name}</div>
                  {loginMap[String(x.email || '').toLowerCase()] !== undefined && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${loginMap[String(x.email || '').toLowerCase()] ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/8 text-[#8a8577]'}`}>
                      {loginMap[String(x.email || '').toLowerCase()] ? t('sch.hasLogin') : t('sch.noLoginYet')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#8a8577]">{x.email}</div>
                <div className="mt-1 text-xs text-[#c9c4b4]">{x.subject || t('sch.general')}</div>
                <RowBtns onEdit={() => startEdit(x)} onDelete={() => delTeacher(x)} />
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
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => { setForm({ title: '', type: 'quiz', instructions: '' }); setEditingId(null); };

  const saveAssessment = async () => {
    if (!form.title.trim()) return;
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        payload: { instructions: form.instructions },
      };
      if (editingId) {
        const updated = await pb.collection('school_assessments').update(editingId, payload);
        setAssessments((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        toast({ title: t('sch.save') });
      } else {
        const created = await pb.collection('school_assessments').create({ ...payload, status: 'published' });
        setAssessments((prev) => [created, ...prev]);
        toast({ title: t('sch.tAsPub', { type: t(`sch.type_${form.type}`, null, form.type) }) });
      }
      resetForm();
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tAsFail'), description: err?.message || t('sch.tTryAgain') });
    }
  };

  const addAssessment = saveAssessment;

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({ title: a.title || '', type: a.type || 'quiz', instructions: a.payload?.instructions || '' });
  };

  const togglePublish = async (a) => {
    const next = (a.status || 'draft') === 'published' ? 'draft' : 'published';
    try {
      const updated = await pb.collection('school_assessments').update(a.id, { status: next });
      setAssessments((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
      toast({ title: next === 'published' ? t('sch.publish') : t('sch.unpublish') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTryAgain'), description: err?.message });
    }
  };

  const delAssessment = async (a) => {
    if (!confirmDel(t)) return;
    try {
      await pb.collection('school_assessments').delete(a.id);
      setAssessments((prev) => prev.filter((x) => x.id !== a.id));
      if (editingId === a.id) resetForm();
      toast({ title: t('sch.delete') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTryAgain'), description: err?.message });
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
            <button onClick={addAssessment} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> {editingId ? t('sch.save') : t('sch.publish')}</button>
            {editingId && <button onClick={resetForm} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-[#8a8577]">{t('sch.cancel')}</button>}
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">{t('sch.published')}</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">{t('sch.loading')}</div> : assessments.length === 0 ? <div className="text-sm text-[#8a8577]">{t('sch.noAssess')}</div> : assessments.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{a.title}</div>
                <div className="text-xs text-[#8a8577] capitalize">{t(`sch.type_${a.type}`, null, a.type)} · {t(`sch.st_${a.status || 'draft'}`, null, a.status || 'draft')}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => togglePublish(a)} className="rounded-lg border border-[#d4af37]/25 px-2.5 py-1 text-xs text-[#d4af37]">{(a.status || 'draft') === 'published' ? t('sch.unpublish') : t('sch.publish')}</button>
                  <RowBtns onEdit={() => startEdit(a)} onDelete={() => delAssessment(a)} />
                </div>
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
  const [grades, setGrades] = useState({});

  const submitForStudent = async () => {
    if (!form.studentName || !form.assessmentTitle || !form.content.trim()) return;
    try {
      const student = students.find((s) => s.name === form.studentName);
      const assessment = assessments.find((a) => a.title === form.assessmentTitle);
      const created = await pb.collection('school_submissions').create({
        studentId: student?.id || null,
        assessmentId: assessment?.id || null,
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

  const saveGrade = async (s) => {
    const g = grades[s.id] || {};
    try {
      const updated = await pb.collection('school_submissions').update(s.id, {
        status: 'graded',
        score: g.score === '' || g.score == null ? s.score ?? null : Number(g.score),
        feedback: (g.feedback ?? s.feedback ?? '').toString().slice(0, 2000) || null,
      });
      setSubmissions((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
      setGrades((prev) => { const n = { ...prev }; delete n[s.id]; return n; });
      toast({ title: t('sch.grade') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTryAgain'), description: err?.message });
    }
  };

  const delSubmission = async (s) => {
    if (!confirmDel(t)) return;
    try {
      await pb.collection('school_submissions').delete(s.id);
      setSubmissions((prev) => prev.filter((x) => x.id !== s.id));
      toast({ title: t('sch.delete') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTryAgain'), description: err?.message });
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
                <div className="text-xs text-[#8a8577] capitalize">{t(`sch.type_${s.type}`, null, s.type)} · {t(`sch.st_${s.status || 'submitted'}`, null, s.status || 'submitted')}{s.score != null ? ` · ${t('sch.score')}: ${s.score}` : ''}</div>
                {s.feedback && <div className="mt-1 text-xs text-[#c9c4b4]">{s.feedback}</div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <input value={grades[s.id]?.score ?? ''} onChange={(e) => setGrades((p) => ({ ...p, [s.id]: { ...p[s.id], score: e.target.value } }))} placeholder={t('sch.score')} inputMode="decimal" className="w-20 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 text-xs text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
                  <input value={grades[s.id]?.feedback ?? ''} onChange={(e) => setGrades((p) => ({ ...p, [s.id]: { ...p[s.id], feedback: e.target.value } }))} placeholder={t('sch.feedback')} className="min-w-0 flex-1 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 text-xs text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
                  <button onClick={() => saveGrade(s)} className="rounded-lg border border-[#d4af37]/25 px-2.5 py-1 text-xs text-[#d4af37]">{t('sch.grade')}</button>
                  <button onClick={() => delSubmission(s)} className="rounded-lg border border-red-500/35 px-2.5 py-1 text-xs text-red-400">{t('sch.delete')}</button>
                </div>
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
  const { toast } = useToast();
  const { loading, students } = useCompanySchoolData();
  const [platformMatches, setPlatformMatches] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const token = pb.authStore.token;
        if (!token) return;
        const res = await fetch('/hcgi/api/company/academy-interest', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setPlatformMatches(await res.json());
      } catch { /* discovery unavailable */ }
    })();
  }, []);

  const academyInterested = useMemo(() => {
    const studentMatches = students.filter((s) => s.academyInterest);
    return { userMatches: platformMatches, studentMatches };
  }, [platformMatches, students]);

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
            {loading ? <div className="text-sm text-[#8a8577]">{t('sch.loading')}</div> : academyInterested.userMatches.length === 0 ? <div className="text-sm text-[#8a8577]">{t('sch.noMatch')}</div> : academyInterested.userMatches.map((u, i) => (
              <div key={`${u.username}-${i}`} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{u.username || t('sch.userFb')}</div>
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
