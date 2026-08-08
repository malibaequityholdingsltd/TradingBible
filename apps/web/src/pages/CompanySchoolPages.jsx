import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileCheck2, GraduationCap, Plus, User, Users } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { useToast } from '@/hooks/use-toast';

const box = 'glass rounded-2xl p-5';
const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40';

function RoleBanner({ admin, teacher, student }) {
  return (
    <div className="mb-5 grid gap-3 md:grid-cols-3">
      <div className="glass rounded-xl p-3 text-xs leading-relaxed text-[#c9c4b4]"><span className="text-[#d4af37]">Company Admin:</span> {admin}</div>
      <div className="glass rounded-xl p-3 text-xs leading-relaxed text-[#c9c4b4]"><span className="text-[#d4af37]">Teacher:</span> {teacher}</div>
      <div className="glass rounded-xl p-3 text-xs leading-relaxed text-[#c9c4b4]"><span className="text-[#d4af37]">Student:</span> {student}</div>
    </div>
  );
}

function useCompanySchoolData() {
  const { toast } = useToast();
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
      toast({ variant: 'destructive', title: 'Failed to load school data', description: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);
  return { loading, students, teachers, assessments, submissions, users, setStudents, setTeachers, setAssessments, setSubmissions, reload };
}

export function CompanyStudentsPage() {
  const { toast } = useToast();
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
      toast({ title: 'Student added' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to add student', description: err?.message || 'Please try again.' });
    }
  };

  return (
    <AppLayout title="Company · Students">
      <RoleBanner
        admin="Create and manage student profiles and class lists."
        teacher="Review student profiles and track academy interest."
        student="Your school profile helps teachers assign courses and tests."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Users className="h-4 w-4 text-[#d4af37]" /> Add student</h2>
          <div className="mt-3 space-y-2">
            <input className={input} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Student name" />
            <input className={input} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Student email" />
            <input className={input} value={form.classroom} onChange={(e) => setForm((p) => ({ ...p, classroom: e.target.value }))} placeholder="Classroom (e.g. Grade 11 A)" />
            <label className="flex items-center gap-2 text-sm text-[#c9c4b4]">
              <input type="checkbox" checked={form.academyInterest} onChange={(e) => setForm((p) => ({ ...p, academyInterest: e.target.checked }))} className="h-4 w-4 accent-[#d4af37]" />
              Interested in academy track
            </label>
            <button onClick={addStudent} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> Save student profile</button>
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">Student profiles</h2>
          <p className="mt-1 text-xs text-[#8a8577]">School admins and teachers can quickly open academy-ready profiles.</p>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">Loading...</div> : students.length === 0 ? <div className="text-sm text-[#8a8577]">No students yet.</div> : students.map((s) => (
              <div key={s.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{s.name}</div>
                <div className="text-xs text-[#8a8577]">{s.email} · {s.classroom || 'General'}</div>
                <div className="mt-1 text-xs text-[#c9c4b4]">{s.academyInterest ? 'Academy interested' : 'General track'}</div>
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
  const { loading, teachers, setTeachers } = useCompanySchoolData();
  const [form, setForm] = useState({ name: '', email: '', subject: 'Trading Fundamentals' });

  const addTeacher = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      const created = await pb.collection('school_teachers').create({ ...form, name: form.name.trim(), email: form.email.trim() });
      setTeachers((prev) => [created, ...prev]);
      setForm({ name: '', email: '', subject: 'Trading Fundamentals' });
      toast({ title: 'Teacher added' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to add teacher', description: err?.message || 'Please try again.' });
    }
  };

  return (
    <AppLayout title="Company · Teachers">
      <RoleBanner
        admin="Add teacher accounts and map subject coverage."
        teacher="Manage assigned classes and course delivery."
        student="Your teachers appear here with subject ownership."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><GraduationCap className="h-4 w-4 text-[#d4af37]" /> Add teacher</h2>
          <div className="mt-3 space-y-2">
            <input className={input} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Teacher name" />
            <input className={input} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Teacher email" />
            <input className={input} value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Subject focus" />
            <button onClick={addTeacher} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> Save teacher profile</button>
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">Teacher directory</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">Loading...</div> : teachers.length === 0 ? <div className="text-sm text-[#8a8577]">No teachers yet.</div> : teachers.map((t) => (
              <div key={t.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{t.name}</div>
                <div className="text-xs text-[#8a8577]">{t.email}</div>
                <div className="mt-1 text-xs text-[#c9c4b4]">{t.subject || 'General'}</div>
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
      toast({ title: `${form.type} published` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to publish assessment', description: err?.message || 'Please try again.' });
    }
  };

  return (
    <AppLayout title="Company · Exams & Quizzes">
      <RoleBanner
        admin="Publish exams, tests, quizzes, and homework globally."
        teacher="Run classroom assessments and grade submissions."
        student="Complete your assigned assessment on the Submissions page."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><BookOpen className="h-4 w-4 text-[#d4af37]" /> Create exam/test/quiz/homework</h2>
          <div className="mt-3 space-y-2">
            <input className={input} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Assessment title" />
            <select className={input} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
              <option value="quiz">Quiz</option>
              <option value="test">Test</option>
              <option value="exam">Exam</option>
              <option value="homework">Homework</option>
            </select>
            <textarea className={`${input} min-h-[120px]`} value={form.instructions} onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))} placeholder="Instructions students should follow before submission" />
            <button onClick={addAssessment} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> Publish assessment</button>
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">Published assessments</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">Loading...</div> : assessments.length === 0 ? <div className="text-sm text-[#8a8577]">No assessments yet.</div> : assessments.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{a.title}</div>
                <div className="text-xs text-[#8a8577] capitalize">{a.type} · {a.status || 'draft'}</div>
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
      toast({ title: 'Submission sent' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to submit work', description: err?.message || 'Please try again.' });
    }
  };

  return (
    <AppLayout title="Company · Student Submissions">
      <RoleBanner
        admin="Monitor all student submissions and audit status."
        teacher="Review, score, and provide feedback for each submission."
        student="Submit quiz, test, exam, and homework work quickly."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><FileCheck2 className="h-4 w-4 text-[#d4af37]" /> Submit exam/test/quiz/homework</h2>
          <div className="mt-3 space-y-2">
            <select className={input} value={form.studentName} onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))}>
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <select className={input} value={form.assessmentTitle} onChange={(e) => {
              const selected = assessments.find((a) => a.title === e.target.value);
              setForm((p) => ({ ...p, assessmentTitle: e.target.value, type: selected?.type || p.type }));
            }}>
              <option value="">Select assessment</option>
              {assessments.map((a) => <option key={a.id} value={a.title}>{a.title}</option>)}
            </select>
            <textarea className={`${input} min-h-[140px]`} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Student answer / upload notes / homework text" />
            <button onClick={submitForStudent} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> Submit now</button>
          </div>
        </div>
        <div className={box}>
          <h2 className="font-semibold text-[#f0ecdd]">Submission queue</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">Loading...</div> : submissions.length === 0 ? <div className="text-sm text-[#8a8577]">No submissions yet.</div> : submissions.map((s) => (
              <div key={s.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{s.studentName} · {s.assessmentTitle}</div>
                <div className="text-xs text-[#8a8577] capitalize">{s.type} · {s.status || 'submitted'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function CompanyAcademyProfilesPage() {
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
    <AppLayout title="Company · Academy Profiles">
      <RoleBanner
        admin="Find academy-ready profiles for outreach and enrollment."
        teacher="Recommend learners into academy tracks."
        student="Set clear learning goals so schools can support your path."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><User className="h-4 w-4 text-[#d4af37]" /> Interested individual profiles</h2>
          <p className="mt-1 text-xs text-[#8a8577]">People likely interested in academy programs, easy for school outreach.</p>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">Loading...</div> : academyInterested.userMatches.length === 0 ? <div className="text-sm text-[#8a8577]">No matching profiles yet.</div> : academyInterested.userMatches.map((u) => (
              <div key={u.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{u.username || u.name || 'User'}</div>
                <div className="text-xs text-[#8a8577]">{u.email}</div>
                <div className="mt-1 text-xs text-[#c9c4b4]">{u.goal || 'No goal set yet'}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={box}>
          <h2 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Users className="h-4 w-4 text-[#d4af37]" /> School student academy list</h2>
          <div className="mt-3 space-y-2">
            {loading ? <div className="text-sm text-[#8a8577]">Loading...</div> : academyInterested.studentMatches.length === 0 ? <div className="text-sm text-[#8a8577]">No academy-interested students yet.</div> : academyInterested.studentMatches.map((s) => (
              <div key={s.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{s.name}</div>
                <div className="text-xs text-[#8a8577]">{s.email} · {s.classroom || 'General'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
