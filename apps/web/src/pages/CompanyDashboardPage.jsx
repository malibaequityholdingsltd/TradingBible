import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, FileCheck2, GraduationCap, Plus, Trophy } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const cardCls = 'glass rounded-2xl p-5';

export default function CompanyDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
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
      toast({ variant: 'destructive', title: 'Failed to load school dashboard', description: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveSchoolProfile = async () => {
    try {
      await pb.collection('users').update(user.id, { accountType: 'company', companyName: schoolName });
      toast({ title: 'School profile saved' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to save profile', description: err?.message || 'Please try again.' });
    }
  };

  const addClassroom = async () => {
    if (!className.trim()) return;
    try {
      const rec = await pb.collection('school_classrooms').create({ name: className.trim(), schoolName: schoolName || user?.companyName || 'TradingBible School', studentsCount: 0, teachersCount: 1 });
      setClassrooms((prev) => [rec, ...prev]);
      setClassName('');
      toast({ title: 'Classroom added' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to add classroom', description: err?.message || 'Please try again.' });
    }
  };

  const addAssessment = async () => {
    if (!assessment.title.trim()) return;
    try {
      const rec = await pb.collection('school_assessments').create({ title: assessment.title.trim(), type: assessment.type, status: 'draft' });
      setAssessments((prev) => [rec, ...prev]);
      setAssessment({ title: '', type: assessment.type });
      toast({ title: `${assessment.type} created` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to create assessment', description: err?.message || 'Please try again.' });
    }
  };

  const issueCertificate = async () => {
    try {
      const rec = await pb.collection('school_certificates').create({
        title: 'Trading Risk Discipline',
        studentName: 'Sample Student',
        issuedAt: new Date().toISOString(),
      });
      setCerts((prev) => [rec, ...prev]);
      toast({ title: 'Certificate issued' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to issue certificate', description: err?.message || 'Please try again.' });
    }
  };

  const summary = useMemo(() => ({
    classrooms: classrooms.length,
    assessments: assessments.length,
    certificates: certs.length,
  }), [classrooms.length, assessments.length, certs.length]);

  return (
    <AppLayout title="Company Dashboard">
      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <Link to="/company/students" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">Students</Link>
        <Link to="/company/teachers" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">Teachers</Link>
        <Link to="/company/assessments" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">Exams & Quizzes</Link>
        <Link to="/company/submissions" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">Submissions</Link>
        <Link to="/company/academy-profiles" className="glass rounded-xl px-4 py-3 text-sm text-[#c9c4b4] hover:text-[#f0ecdd]">Academy Profiles</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={cardCls}><div className="text-xs text-[#8a8577]">Classrooms</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.classrooms}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">Assessments</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.assessments}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">Certificates</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{summary.certificates}</div></div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><GraduationCap className="h-4 w-4 text-[#d4af37]" /> School profile</h3>
          <div className="mt-3 flex gap-2">
            <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="School/company name" className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
            <button onClick={saveSchoolProfile} className="rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f]">Save</button>
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><BookOpen className="h-4 w-4 text-[#d4af37]" /> Classrooms</h3>
          <div className="mt-3 flex gap-2">
            <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Grade 11 - Forex A" className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
            <button onClick={addClassroom} className="inline-flex items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><Plus className="h-4 w-4" /> Add</button>
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
            {classrooms.slice(0, 5).map((c) => <div key={c.id} className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{c.name}</div>)}
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><FileCheck2 className="h-4 w-4 text-[#d4af37]" /> Tests, quizzes, exams</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
            <input value={assessment.title} onChange={(e) => setAssessment((prev) => ({ ...prev, title: e.target.value }))} placeholder="Assessment title" className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
            <select value={assessment.type} onChange={(e) => setAssessment((prev) => ({ ...prev, type: e.target.value }))} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#f0ecdd]">
              <option value="quiz">Quiz</option>
              <option value="test">Test</option>
              <option value="exam">Exam</option>
              <option value="competition">Competition</option>
            </select>
            <button onClick={addAssessment} className="rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]">Create</button>
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
            {assessments.slice(0, 5).map((a) => <div key={a.id} className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{a.title} · <span className="capitalize">{a.type}</span></div>)}
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Award className="h-4 w-4 text-[#d4af37]" /> Certificates & competitions</h3>
          <div className="mt-3 flex items-center gap-3 text-sm text-[#8a8577]">
            <button onClick={issueCertificate} className="inline-flex items-center gap-1 rounded-xl border border-[#d4af37]/25 px-3 py-2 text-[#d4af37]"><Trophy className="h-4 w-4" /> Issue sample certificate</button>
            {loading && <span>Syncing...</span>}
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#c9c4b4]">
            {certs.slice(0, 5).map((c) => <div key={c.id} className="rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2">{c.title} · {c.studentName || 'Student'}</div>)}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
