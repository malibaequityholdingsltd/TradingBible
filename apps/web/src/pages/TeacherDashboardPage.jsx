import React, { useEffect, useState } from 'react';
import { Award, BookOpen, GraduationCap, Users, Briefcase } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

const cardCls = 'glass rounded-2xl p-5';

function TeacherGuard({ children }) {
  const { isAuthed, isAuthReady, user } = useAuth();
  if (!isAuthReady) {
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
  if (user?.accountType !== 'teacher' && user?.role !== 'admin') return <Navigate to="/app" replace />;
  return children;
}

export default function TeacherDashboardPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_SERVER_URL}/company/teacher/overview`, {
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

  if (loading || !scope) {
    return (
      <AppLayout title={t('sch.tePortal')}>
        <div className="py-16 text-center text-sm text-[#8a8577]">{t('sch.loading')}</div>
      </AppLayout>
    );
  }

  const a = scope.academy || {};

  return (
    <AppLayout title={t('sch.tePortal')}>
      <div className="mb-5 glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><GraduationCap className="h-6 w-6" /></div>
          <div>
            <div className="font-semibold text-[#f0ecdd]">{scope.teacher?.name}</div>
            <div className="text-xs text-[#8a8577]">{scope.teacher?.subject || t('sch.general')} · {scope.teacher?.email}</div>
          </div>
        </div>
        {scope.teacher?.bio && <p className="mt-3 text-sm leading-relaxed text-[#c9c4b4]">{scope.teacher.bio}</p>}
      </div>

      <div className="mb-5 grid gap-3 grid-cols-2 xl:grid-cols-4">
        <div className={cardCls}><div className="flex items-center gap-2 text-xs text-[#8a8577]"><Users className="h-4 w-4 text-[#d4af37]" />{t('sch.acadEnroll')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{a.enrollments || 0}</div></div>
        <div className={cardCls}><div className="flex items-center gap-2 text-xs text-[#8a8577]"><BookOpen className="h-4 w-4 text-[#d4af37]" />{t('sch.lessonsDone')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{a.lessonsCompleted || 0}</div></div>
        <div className={cardCls}><div className="flex items-center gap-2 text-xs text-[#8a8577]"><Award className="h-4 w-4 text-[#d4af37]" />{t('sch.certsIssued')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{a.certificates || 0}</div></div>
        <div className={cardCls}><div className="flex items-center gap-2 text-xs text-[#8a8577]"><Briefcase className="h-4 w-4 text-[#d4af37]" />{t('sch.webAttended')}</div><div className="mt-2 text-2xl font-semibold text-[#f0ecdd]">{a.webinarAttended || 0}<span className="text-sm text-[#8a8577]">/{a.webinarRsvps || 0}</span></div></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={cardCls}>
          <h3 className="font-semibold text-[#f0ecdd]">{t('sch.enrollByPath')}</h3>
          <div className="mt-3 space-y-2">
            {Object.keys(a.byPath || {}).length === 0 && <div className="text-sm text-[#8a8577]">{t('sch.noEnroll')}</div>}
            {Object.entries(a.byPath || {}).map(([path, n]) => (
              <div key={path} className="flex items-center justify-between rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2 text-sm">
                <span className="capitalize text-[#c9c4b4]">{path}</span>
                <span className="font-mono text-[#f0ecdd]">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Briefcase className="h-4 w-4 text-[#d4af37]" /> {t('sch.myApplications')}</h3>
          <div className="mt-3 space-y-2">
            {(scope.myApplications || []).length === 0 && <div className="text-sm text-[#8a8577]">{t('sch.noApplications')}</div>}
            {(scope.myApplications || []).map((app) => (
              <div key={app.id} className="flex items-center justify-between rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2 text-sm">
                <span className="text-[#c9c4b4]">{app.job}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${app.status === 'hired' ? 'bg-emerald-400/10 text-emerald-400' : app.status === 'rejected' ? 'bg-red-400/10 text-red-400' : 'bg-[#d4af37]/10 text-[#d4af37]'}`}>{app.status}</span>
              </div>
            ))}
          </div>
          <Link to="/careers" className="mt-3 inline-block text-sm font-semibold text-[#d4af37] hover:underline">{t('sch.viewOpenings')} →</Link>
        </div>
      </div>
    </AppLayout>
  );
}

export { TeacherGuard };
