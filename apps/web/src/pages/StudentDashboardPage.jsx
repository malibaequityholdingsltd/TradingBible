import React, { useEffect, useState } from 'react';
import { Award, BookOpen, FileCheck2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

const cardCls = 'glass rounded-2xl p-5';
const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40';

function StudentGuard({ children }) {
  const { isAuthed, isAuthReady } = useAuth();
  const [state, setState] = useState('checking');

  useEffect(() => {
    if (!isAuthReady || !isAuthed) return;
    (async () => {
      try {
        const res = await fetch(`${API_SERVER_URL}/company/student-scope`, {
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

export default function StudentDashboardPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openExam, setOpenExam] = useState(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API_SERVER_URL}/company/student-scope`, {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) throw new Error();
      setScope(await res.json());
    } catch {
      toast({ variant: 'destructive', title: t('sch.tLoadFail') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submitAnswer = async () => {
    if (!openExam || !answer.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_SERVER_URL}/company/student/submissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: openExam.id, content: answer.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setAnswer('');
      setOpenExam(null);
      await load();
      toast({ title: t('sch.tSuSent') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('sch.tSuFail'), description: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !scope) {
    return (
      <AppLayout title={t('sch.stPortal')}>
        <div className="py-16 text-center text-sm text-[#8a8577]">{t('sch.loading')}</div>
      </AppLayout>
    );
  }

  const answeredIds = new Set((scope.submissions || []).map((s) => s.assessmentId).filter(Boolean));
  const pending = (scope.assessments || []).filter((a) => !answeredIds.has(a.id));

  return (
    <AppLayout title={`${scope.schoolName} · ${t('sch.stPortal')}`}>
      <div className="mb-5 grid gap-3 grid-cols-2 xl:grid-cols-4">
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.myExams')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{pending.length}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.myGrades')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{scope.submissions.length}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{t('sch.myCerts')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{scope.certificates.length}</div></div>
        <div className={cardCls}><div className="text-xs text-[#8a8577]">{scope.student?.classroom || t('sch.general')}</div><div className="mt-2 truncate text-lg font-semibold text-[#f0ecdd]">{scope.student?.name}</div></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><BookOpen className="h-4 w-4 text-[#d4af37]" /> {t('sch.myExams')}</h3>
          <div className="mt-3 space-y-2">
            {pending.length === 0 && <div className="text-sm text-[#8a8577]">{t('sch.queueEmpty')}</div>}
            {pending.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{a.title}</div>
                <div className="text-xs text-[#8a8577] capitalize">{t(`sch.type_${a.type}`, null, a.type)}</div>
                {a.payload?.instructions && <div className="mt-1 text-xs text-[#c9c4b4]">{a.payload.instructions}</div>}
                <button onClick={() => { setOpenExam(a); setAnswer(''); }} className="mt-2 rounded-lg border border-[#d4af37]/25 px-2.5 py-1 text-xs text-[#d4af37]">{t('sch.answerNow', null, 'Answer')}</button>
              </div>
            ))}
          </div>
          {openExam && (
            <div className="mt-3 space-y-2 rounded-xl border border-[#d4af37]/25 p-3">
              <div className="text-sm font-semibold text-[#f0ecdd]">{openExam.title}</div>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t('sch.answerPh')} className={`${input} min-h-[120px]`} />
              <div className="flex gap-2">
                <button onClick={submitAnswer} disabled={busy || !answer.trim()} className="rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] disabled:opacity-60">{t('sch.submitNow')}</button>
                <button onClick={() => { setOpenExam(null); setAnswer(''); }} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[#8a8577]">{t('sch.cancel')}</button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className={cardCls}>
            <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><FileCheck2 className="h-4 w-4 text-[#d4af37]" /> {t('sch.myGrades')}</h3>
            <div className="mt-3 space-y-2">
              {scope.submissions.length === 0 && <div className="text-sm text-[#8a8577]">{t('sch.noSubs')}</div>}
              {scope.submissions.map((s) => (
                <div key={s.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                  <div className="font-medium text-[#f0ecdd]">{s.assessmentTitle}</div>
                  <div className="text-xs text-[#8a8577] capitalize">{t(`sch.st_${s.status || 'submitted'}`, null, s.status || 'submitted')}{s.score != null ? ` · ${t('sch.score')}: ${s.score}` : ''}</div>
                  {s.feedback && <div className="mt-1 text-xs text-[#c9c4b4]">{s.feedback}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Award className="h-4 w-4 text-[#d4af37]" /> {t('sch.myCerts')}</h3>
            <div className="mt-3 space-y-2">
              {scope.certificates.length === 0 && <div className="text-sm text-[#8a8577]">{t('sch.dCerts')}</div>}
              {scope.certificates.map((c) => (
                <div key={c.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                  <div className="font-medium text-[#f0ecdd]">{c.title}</div>
                  <div className="text-xs text-[#8a8577]">{c.issuedAt ? c.issuedAt.slice(0, 10) : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export { StudentGuard };
