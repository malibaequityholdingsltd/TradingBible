import React, { useEffect, useState } from 'react';
import { Award, BookOpen, FileCheck2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Card, SectionHead, Stat, StatGrid, EmptyState, GoldButton, GhostButton, Skeleton } from '@/components/ui-kit';

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
        <Card className="p-5">
          <Skeleton className="h-4 w-1/3" />
          <div className="mt-2.5 space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <div className="mt-3 text-center text-sm text-[#8a8577]">{t('sch.loading')}</div>
        </Card>
      </AppLayout>
    );
  }

  const safeScope = scope && !Array.isArray(scope) ? scope : {};
  const submissions = Array.isArray(safeScope.submissions) ? safeScope.submissions : [];
  const assessments = Array.isArray(safeScope.assessments) ? safeScope.assessments : [];
  const certificates = Array.isArray(safeScope.certificates) ? safeScope.certificates : [];
  const answeredIds = new Set(submissions.map((s) => s.assessmentId).filter(Boolean));
  const pending = assessments.filter((a) => !answeredIds.has(a.id));

  return (
    <AppLayout title={`${safeScope.schoolName || 'Academy'} · ${t('sch.stPortal')}`}>
      <StatGrid cols={4}>
        <Stat label={t('sch.myExams')} value={pending.length} />
        <Stat label={t('sch.myGrades')} value={submissions.length} />
        <Stat label={t('sch.myCerts')} value={certificates.length} />
        <Stat label={safeScope.student?.classroom || t('sch.general')} value={safeScope.student?.name} />
      </StatGrid>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHead icon={BookOpen} title={t('sch.myExams')} />
          <div className="mt-3 space-y-2">
            {pending.length === 0 && <EmptyState icon={BookOpen} title={t('sch.queueEmpty')} />}
            {pending.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                <div className="font-medium text-[#f0ecdd]">{a.title}</div>
                <div className="text-xs text-[#8a8577] capitalize">{t(`sch.type_${a.type}`, null, a.type)}</div>
                {a.payload?.instructions && <div className="mt-1 text-xs text-[#c9c4b4]">{a.payload.instructions}</div>}
                <GhostButton onClick={() => { setOpenExam(a); setAnswer(''); }} className="mt-2 !min-h-0 !px-2.5 !py-1 !text-xs">{t('sch.answerNow', null, 'Answer')}</GhostButton>
              </div>
            ))}
          </div>
          {openExam && (
            <div className="mt-3 space-y-2 rounded-xl border border-[#d4af37]/25 p-3">
              <div className="text-sm font-semibold text-[#f0ecdd]">{openExam.title}</div>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t('sch.answerPh')} className={`${input} min-h-[120px]`} />
              <div className="flex gap-2">
                <GoldButton onClick={submitAnswer} disabled={busy || !answer.trim()} className="!px-4 !py-2 !text-sm">{t('sch.submitNow')}</GoldButton>
                <GhostButton onClick={() => { setOpenExam(null); setAnswer(''); }} className="!px-4 !py-2 !text-sm">{t('sch.cancel')}</GhostButton>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <SectionHead icon={FileCheck2} title={t('sch.myGrades')} />
            <div className="mt-3 space-y-2">
              {submissions.length === 0 && <EmptyState icon={FileCheck2} title={t('sch.noSubs')} />}
              {submissions.map((s) => (
                <div key={s.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                  <div className="font-medium text-[#f0ecdd]">{s.assessmentTitle}</div>
                  <div className="text-xs text-[#8a8577] capitalize">{t(`sch.st_${s.status || 'submitted'}`, null, s.status || 'submitted')}{s.score != null ? ` · ${t('sch.score')}: ${s.score}` : ''}</div>
                  {s.feedback && <div className="mt-1 text-xs text-[#c9c4b4]">{s.feedback}</div>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHead icon={Award} title={t('sch.myCerts')} />
            <div className="mt-3 space-y-2">
              {certificates.length === 0 && <EmptyState icon={Award} title={t('sch.dCerts')} />}
              {certificates.map((c) => (
                <div key={c.id} className="rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] p-3">
                  <div className="font-medium text-[#f0ecdd]">{c.title}</div>
                  <div className="text-xs text-[#8a8577]">{c.issuedAt ? c.issuedAt.slice(0, 10) : ''}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export { StudentGuard };
