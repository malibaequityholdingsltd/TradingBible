import React, { useEffect, useState } from 'react';
import { BookOpen, FileCheck2, GraduationCap, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

const cardCls = 'glass rounded-2xl p-5';

function TeacherGuard({ children }) {
  const { isAuthed, isAuthReady } = useAuth();
  const [state, setState] = useState('checking'); // checking | ok | denied

  useEffect(() => {
    if (!isAuthReady || !isAuthed) return;
    (async () => {
      try {
        const res = await fetch(`${API_SERVER_URL}/company/teacher-scope`, {
          headers: { Authorization: `Bearer ${pb.authStore.token}` },
        });
        setState(res.ok ? 'ok' : 'denied');
      } catch {
        setState('denied');
      }
    })();
  }, [isAuthReady, isAuthed]);

  if (!isAuthReady || state === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[#8a8577]">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4af37]/40 border-t-[#d4af37]" />
          Loading…
        </div>
      </div>
    );
  }
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (state === 'denied') return <Navigate to="/app" replace />;
  return children;
}

export default function TeacherDashboardPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_SERVER_URL}/company/teacher-scope`, {
          headers: { Authorization: `Bearer ${pb.authStore.token}` },
        });
        if (!res.ok) throw new Error();
        setScope(await res.json());
      } catch {
        toast({ variant: 'destructive', title: t('sch.tLoadFail') });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast, t]);

  const saveGrade = async (s) => {
    const g = grades[s.id] || {};
    setBusy(s.id);
    try {
      const res = await fetch(`${API_SERVER_URL}/company/submissions/${encodeURIComponent(s.id)}/grade`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: g.score ?? null, feedback: g.feedback ?? '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setScope((prev) => ({
        ...prev,
        submissions: prev.submissions.map((x) => (x.id === s.id ? { ...x, ...data } : x)),
      }));
      setGrades((prev) => { const n = { ...prev }; delete n[s.id]; return n; });
      toast({ title: t('sch.grade') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tTryAgain'), description: err.message });
    } finally {
      setBusy(null);
    }
  };

  if (loading || !scope) {
    return (
      <AppLayout title={t('sch.tePortal')}>
        <div className="py-16 text-center text-sm text-[#8a8577]">{t('sch.loading')}</div>
      </AppLayout>
    );
  }

  const queue = (scope.submissions || []).filter((s) => s.status !== 'graded');
  const graded = (scope.submissions || []).filter((s) => s.status === 'graded');

  return (
    <AppLayout title={`${scope.schoolName} · ${t('sch.tePortal')}`}>
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className={cardCls}><div className="flex items-center gap-2 text-xs text-[#8a8577]"><Users className="h-4 w-4 text-[#d4af37]" />{t('sch.dStudents')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{scope.students.length}</div></div>
        <div className={cardCls}><div className="flex items-center gap-2 text-xs text-[#8a8577]"><BookOpen className="h-4 w-4 text-[#d4af37]" />{t('sch.dAssessments')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{scope.assessments.length}</div></div>
        <div className={cardCls}><div className="flex items-center gap-2 text-xs text-[#8a8577]"><FileCheck2 className="h-4 w-4 text-[#d4af37]" />{t('sch.toGrade')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{queue.length}</div></div>
        <div className={cardCls}><div className="flex items-center gap-2 text-xs text-[#8a8577]"><GraduationCap className="h-4 w-4 text-[#d4af37]" />{t('sch.gradedCount')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{graded.length}</div></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={cardCls}>
          <h3 className="font-semibold text-[#f0ecdd]">{t('sch.gradeQueue')}</h3>
          <div className="mt-3 space-y-2">
            {queue.length === 0 && <div className="text-sm text-[#8a8577]">{t('sch.queueEmpty')}</div>}
            {queue.map((s) => (
              <div key={s.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{s.studentName} · {s.assessmentTitle}</div>
                <div className="mt-1 max-h-20 overflow-y-auto text-xs text-[#c9c4b4]">{s.content}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input value={grades[s.id]?.score ?? ''} onChange={(e) => setGrades((p) => ({ ...p, [s.id]: { ...p[s.id], score: e.target.value } }))} placeholder={t('sch.score')} inputMode="decimal" className="w-20 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 text-xs text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
                  <input value={grades[s.id]?.feedback ?? ''} onChange={(e) => setGrades((p) => ({ ...p, [s.id]: { ...p[s.id], feedback: e.target.value } }))} placeholder={t('sch.feedback')} className="min-w-0 flex-1 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 text-xs text-[#f0ecdd] outline-none focus:border-[#d4af37]/40" />
                  <button onClick={() => saveGrade(s)} disabled={busy === s.id} className="rounded-lg border border-[#d4af37]/25 px-2.5 py-1 text-xs text-[#d4af37] disabled:opacity-60">{t('sch.grade')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="font-semibold text-[#f0ecdd]">{t('sch.myStudents')}</h3>
          <div className="mt-3 space-y-2">
            {scope.students.length === 0 && <div className="text-sm text-[#8a8577]">{t('sch.noStudents')}</div>}
            {scope.students.map((s) => (
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

export { TeacherGuard };
