import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Briefcase, CalendarDays, GraduationCap, Mail,
  MessageSquare, PlayCircle, ShieldCheck, Sparkles, Users,
} from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AdSlot } from '@/lib/ads/components.jsx';
import { Card, GhostButton, GoldButton, Kicker } from '@/components/ui-kit';
import PublicSiteShell, {
  PublicCTA, PublicCheckList, PublicNotice, PublicPageHead, PublicSection,
} from '@/components/PublicSiteShell';
import { usePlatformSettings } from '@/lib/platformSettings';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';

/* ------------------------------------------------------------------ */
/* Shared editorial page                                               */
/* ------------------------------------------------------------------ */

function EditorialPage({ eyebrow, title, description, meta, points, cards, cta, children }) {
  return (
    <PublicSiteShell>
      <PublicPageHead eyebrow={eyebrow} title={title} description={description} meta={meta}
        actions={<><GoldButton to={cta?.to || '/signup'}>{cta?.label || 'Create an account'} <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/pricing" className="border px-5 py-3 text-[#e9e7df]">See plans</GhostButton></>} />
      <PublicSection eyebrow="What you get" title="Built for the work, not the highlight reel.">
        <PublicCheckList items={points} />
      </PublicSection>
      {cards?.length > 0 && (
        <PublicSection eyebrow="Inside" title="A closer look.">
          <div className="grid gap-3 md:grid-cols-2">
            {cards.map(([icon, heading, body]) => {
              const Icon = icon || BookOpen;
              return (
                <Card key={heading} className="rounded-xl p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#d4af37]"><Icon className="h-4 w-4" /></span>
                    <h2 className="text-base font-semibold text-[#f0ecdd]">{heading}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">{body}</p>
                </Card>
              );
            })}
          </div>
        </PublicSection>
      )}
      {children}
      <PublicCTA title={<>Start with the record. <span className="tb-gold-text">Build from there.</span></>} body="Plans are paid only and include a 14-day money-back guarantee. No free trial and no invented performance." primary={cta?.label || 'Create an account'} primaryTo={cta?.to || '/signup'} />
    </PublicSiteShell>
  );
}

/* ------------------------------------------------------------------ */
/* Guides                                                              */
/* ------------------------------------------------------------------ */

const GUIDE_STEPS = [
  ['01', 'Create the account', 'Choose a paid plan, verify your email and finish onboarding. TradingBible is a paid product; there is no free-trial tier that mixes demo results into the record.', '/signup'],
  ['02', 'Connect a live account', 'Link a broker or prop firm with read-oriented credentials. The connection names the platform, its scope and the last sync so you always know what is being read.', '/features/broker-integrations'],
  ['03', 'Learn the terminal', 'Use Terminal Pro to search symbols, read a chart, set an alert and move between order flow, heatmaps and TV without losing context.', '/features/trading-overview'],
  ['04', 'Write the first journal entry', 'Let the sync bring in the fills. Add the setup, the thesis and the risk you planned before the trade. The note is the part only you can provide.', '/features/trading-journal'],
  ['05', 'Review with SI', 'Ask SI where risk widened, which setup is working and what to change next. The answer is grounded in the record, not a generic market call.', '/features/si-coach'],
  ['06', 'Choose one focus', 'Leave the review with a single adjustment. Test it on paper, carry it into the next session and check whether you actually followed through.', '/features/risk-management'],
];

const GUIDE_POINTS = [
  'A repeatable start-to-review loop you can run every session',
  'Live broker sync instead of manual trade entry',
  'Risk and position-sizing math before the click',
  'SI reviews tied to your own journal and notes',
  'Academy lessons for charts, risk, psychology and process',
  'Report exports for mentors, prop firms and your own review',
];

export const GuidesPage = () => (
  <PublicSiteShell>
    <PublicPageHead
      eyebrow="Education · Trading guides"
      title={<>Learn the loop. <span className="tb-gold-text">Then run it.</span></>}
      description="A practical guide to setting up TradingBible, connecting a live account and turning the record into a repeatable review. No signal groups, no shortcut around risk."
      meta={['Start to review', 'Live accounts only', 'Member education']}
      actions={<><GoldButton to="/signup">Start the guide <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/academy" className="border px-5 py-3 text-[#e9e7df]">Open the Academy</GhostButton></>}
    />
    <PublicSection eyebrow="Six steps" title="From account to first review." sub="Work through the steps in order. Each one links to the product page or member area that does the job.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {GUIDE_STEPS.map(([n, title, body, to]) => (
          <Card key={n} className="flex flex-col rounded-xl p-5">
            <span className="font-mono text-2xl font-bold tb-gold-text">{n}</span>
            <h2 className="mt-2 text-base font-semibold text-[#f0ecdd]">{title}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[#8a8577]">{body}</p>
            <GhostButton to={to} className="mt-4 w-full justify-center border px-4 py-2.5 text-xs text-[#e9e7df]">Open step <ArrowRight className="h-3.5 w-3.5" /></GhostButton>
          </Card>
        ))}
      </div>
    </PublicSection>
    <PublicSection id="resources" eyebrow="Field notes" title="The ideas behind the workflow.">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <Card className="rounded-xl p-5 sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-[#f0ecdd]">The journal is the strategy.</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">A strategy you cannot compare across a sample is a story. The journal gives the setup a name, keeps the conditions attached and lets the analytics show whether the edge survives contact with real fills. Start by writing down what had to be true for the trade to work — then check whether it was.</p>
          <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">The goal is not a prettier spreadsheet. It is a record you can reopen after ten trades, a hundred trades or a drawdown and still understand the decision that was made.</p>
        </Card>
        <div className="grid gap-3">
          <Card className="rounded-xl p-5">
            <h3 className="text-base font-semibold text-[#f0ecdd]">Risk is planned before entry.</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">Define the loss in account terms, then size the position. A stop that is chosen after the position is open is not a plan; it is a reaction.</p>
          </Card>
          <Card className="rounded-xl p-5">
            <h3 className="text-base font-semibold text-[#f0ecdd]">Review the process, not only the P&amp;L.</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">A winning trade can still be a bad decision. Separate the quality of the decision from the outcome, or the next loss will teach the wrong lesson.</p>
          </Card>
        </div>
      </div>
      <div className="mt-3"><PublicNotice>Educational content only. Trading involves risk; nothing here is financial advice or a promise of profit.</PublicNotice></div>
    </PublicSection>
    <PublicCTA title={<>Put the guide into practice <span className="tb-gold-text">on a live record.</span></>} body="Start a paid plan and connect a live account. The first review is the first useful output." />
  </PublicSiteShell>
);

/* ------------------------------------------------------------------ */
/* Webinars                                                            */
/* ------------------------------------------------------------------ */

const WEBINAR_FORMATS = [
  [PlayCircle, 'Weekly market debrief', 'A structured look at what moved, where risk widened and which setups behaved as planned. Recorded for members who cannot attend live.'],
  [Users, 'SI review workshop', 'A small-group session where SI walks through anonymised member reviews and shows how the same mistake appears across different markets.'],
  [GraduationCap, 'Academy workshop', 'A practical lesson on charts, risk or journaling, followed by a short exercise you can complete in the member area.'],
  [MessageSquare, 'Ask the desk', 'An open question session with the team. No trade calls, no price targets and no promises — just process and record questions.'],
];

export const WebinarsPage = () => (
  <EditorialPage
    eyebrow="Education · Webinars"
    title={<>Live sessions for the <span className="tb-gold-text">work after the trade.</span></>}
    description="TradingBible webinars are working sessions: market debriefs, SI review workshops and Academy lessons. They are recorded, kept inside the member area and built around the record rather than a highlight reel."
    meta={['Members only', 'Recorded', 'No trade calls']}
    points={['Weekly market debrief with a process lens', 'SI review workshops in small groups', 'Academy lessons with practical exercises', 'Recordings and notes inside the member area']}
    cards={WEBINAR_FORMATS}
    cta={{ label: 'Join a session', to: '/signup' }}
  >
    <PublicSection eyebrow="Scheduling" title="No public calendar. No invented dates.">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <Card className="rounded-xl p-5">
          <h2 className="text-base font-semibold text-[#f0ecdd]">The calendar lives where the sessions happen.</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">Upcoming sessions are published inside the member area and announced by email. There is no public countdown here, because an unconfirmed date is not a schedule. If you are not a member yet, start with the recorded Academy lessons.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <GoldButton to="/academy">Browse the Academy <ArrowRight className="h-4 w-4" /></GoldButton>
            <GhostButton to="/contact" className="border px-4 py-2.5 text-[#e9e7df]">Ask a question</GhostButton>
          </div>
        </Card>
        <PublicCheckList items={['Sessions are included with eligible plans', 'Recordings are member-only', 'No session promises a trading result', 'Questions are moderated for safety']} columns={1} />
      </div>
    </PublicSection>
  </EditorialPage>
);

/* ------------------------------------------------------------------ */
/* Academy                                                             */
/* ------------------------------------------------------------------ */

const ACADEMY_TRACKS = [
  [BookOpen, 'Markets & charts', 'Candlesticks, structure, liquidity, order flow and the difference between a setup and a story. Start with the language the terminal uses.'],
  [ShieldCheck, 'Risk & position sizing', 'R-multiples, stop placement, exposure, drawdown and the math that keeps one bad session from becoming the end of the account.'],
  [CalendarDays, 'Journal & review', 'A repeatable way to record a decision, tag the setup and review the sample without rewriting history after the outcome is known.'],
  [Sparkles, 'SI & process', 'How to ask SI a useful question, how to read a review and how to turn an observation into one measurable adjustment.'],
];

const ACADEMY_POINTS = [
  'Structured tracks from first chart to first review',
  'Lessons kept inside the product, next to the journal',
  'Practical exercises rather than passive video hours',
  'No profit claims, trade signals or copy-trading',
  'Member progress stays private by default',
  'Eligible plans include the full Academy library',
];

export const AcademyInfoPage = () => (
  <PublicSiteShell>
    <PublicPageHead
      eyebrow="Education · TradingBible Academy"
      title={<>Learn the desk <span className="tb-gold-text">before you scale it.</span></>}
      description="The Academy is a structured curriculum for the tools you actually use: charts, order flow, risk, journaling, SI reviews and the discipline of a repeatable process. It is education, not a signal service."
      meta={['Member library', 'Practical exercises', 'No profit claims']}
      actions={<><GoldButton to="/app/academy">Open the Academy <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/guides" className="border px-5 py-3 text-[#e9e7df]">Read the setup guide</GhostButton></>}
    />
    <PublicSection eyebrow="Tracks" title="Four tracks. One workflow." sub="Each track ends with an exercise you can apply to your own record.">
      <div className="grid gap-3 md:grid-cols-2">
        {ACADEMY_TRACKS.map(([icon, title, body]) => {
          const Icon = icon;
          return (
            <Card key={title} className="rounded-xl p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#d4af37]"><Icon className="h-4 w-4" /></span>
                <h2 className="text-base font-semibold text-[#f0ecdd]">{title}</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">{body}</p>
            </Card>
          );
        })}
      </div>
    </PublicSection>
    <PublicSection id="courses" eyebrow="The curriculum" title="What is included.">
      <PublicCheckList items={ACADEMY_POINTS} />
      <div className="mt-3"><PublicNotice>Academy content is educational. Completing a course does not guarantee funding, returns or a trading outcome.</PublicNotice></div>
    </PublicSection>
    <PublicCTA title={<>Learn inside the product <span className="tb-gold-text">you actually trade with.</span></>} body="Open the member Academy on an eligible plan, or start with the public setup guide." primary="Open the Academy" primaryTo="/app/academy" secondary="Read the guide" secondaryTo="/guides" />
  </PublicSiteShell>
);

/* ------------------------------------------------------------------ */
/* Blog / field notes                                                  */
/* ------------------------------------------------------------------ */

const BLOG_POSTS = [
  {
    title: 'Why a read-only broker connection is the right default',
    kicker: 'Security',
    body: 'A journal does not need permission to trade. It needs permission to read. Keeping the connection read-only limits the blast radius of a leaked key and makes the system easier to audit. TradingBible names the platform, the scope and the last sync, and lets you revoke the connection without deleting the history you already reviewed. The principle is simple: the smallest permission that does the job is the permission you should grant.',
  },
  {
    title: 'The journal is not a diary. It is the evidence.',
    kicker: 'Process',
    body: 'A useful journal entry records the conditions that made the trade valid before the outcome was known: the setup, the trigger, the invalidation and the planned risk. A page of feelings written after the close is not evidence; it is a story adjusted to fit the result. The journal becomes powerful when the same fields are filled in every time and the analytics can compare them across a sample.',
  },
  {
    title: 'What SI can and cannot see',
    kicker: 'SI Coach',
    body: 'SI reads the record you have connected: synced trades, notes, tags and reviews. It can point to a repeated mistake, a risk pattern or a setup that is not behaving as planned. It cannot see your private thoughts unless you write them down, cannot place an order and cannot promise a return. The boundary is deliberate. The coach is there to improve the review, not to make the decision for you.',
  },
];

export const BlogPage = () => (
  <PublicSiteShell>
    <PublicPageHead
      eyebrow="Company · Field notes"
      title={<>Notes from the <span className="tb-gold-text">record.</span></>}
      description="Short essays on journaling, risk, broker permissions and the limits of an AI review. Written by the TradingBible team, not generated as a market feed."
      meta={['Editorial', 'No market calls', 'Evergreen notes']}
      actions={<><GoldButton to="/guides">Read the guide <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/features" className="border px-5 py-3 text-[#e9e7df]">Explore the product</GhostButton></>}
    />
    <PublicSection eyebrow="Field notes" title="Three ideas we keep coming back to.">
      <div className="space-y-3">
        {BLOG_POSTS.map((post) => (
          <Card key={post.title} className="rounded-xl p-5 sm:p-6">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">{post.kicker}</div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-[#f0ecdd]">{post.title}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[#8a8577]">{post.body}</p>
          </Card>
        ))}
      </div>
    </PublicSection>
    <ErrorBoundary fallback={null}><div className="mx-auto mt-4 max-w-3xl px-5"><AdSlot placementId="ph_blog_feed" /></div></ErrorBoundary>
    <PublicCTA title={<>Read less hype. <span className="tb-gold-text">Review more of your own record.</span></>} body="The useful next step is not another article. It is the first live trade in the journal." />
  </PublicSiteShell>
);

/* ------------------------------------------------------------------ */
/* Careers                                                             */
/* ------------------------------------------------------------------ */

export const CareersPage = () => {
  const { t } = useI18n();
  const [jobs, setJobs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', coverLetter: '', samples: '', website: '', answers: {} });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [applyErr, setApplyErr] = useState('');
  const resetForm = () => { setForm({ name: '', email: '', phone: '', coverLetter: '', samples: '', website: '', answers: {} }); setApplyErr(''); };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/hcgi/api/jobs');
        if (res.ok) setJobs(await res.json());
      } catch { /* the board stays empty if the API is unreachable */ }
    })();
  }, []);

  const apply = async (e) => {
    e?.preventDefault?.();
    if (!openId || !form.name.trim() || !form.email.trim()) return;
    setBusy(true);
    setApplyErr('');
    try {
      const res = await fetch('/hcgi/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: openId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'request failed');
      setDone(true);
      resetForm();
    } catch (err) {
      setDone(false);
      setApplyErr(err?.message || 'request failed');
    } finally {
      setBusy(false);
    }
  };

  const openJob = jobs.find((j) => j.id === openId) || null;
  const screeningQs = Array.isArray(openJob?.hiring?.screening) ? openJob.hiring.screening : [];
  const samplesRequired = openJob?.hiring?.samples_required === true;
  const field = 'w-full rounded-xl border border-[#d4af37]/20 bg-white/[0.04] px-4 py-3 text-sm text-[#f0ecdd] outline-none placeholder:text-[#6e6a5e] focus:border-[#d4af37]/55';

  return (
    <PublicSiteShell>
      <PublicPageHead
        eyebrow="Company · Careers"
        title={<>Build the record <span className="tb-gold-text">with us.</span></>}
        description="TradingBible is a private, pre-IPO company building a record-first trading platform. We hire remote-first operators who care about evidence, security and the unglamorous work behind a reliable product."
        meta={[`${jobs.length} open ${jobs.length === 1 ? 'role' : 'roles'}`, 'Remote-first', 'Human reviewed']}
        actions={<><GoldButton to="#open-roles">See open roles <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/about" className="border px-5 py-3 text-[#e9e7df]">About TradingBible</GhostButton></>}
      />
      <PublicSection id="open-roles" eyebrow="Hiring board" title="Open roles." sub="Applications are reviewed by a person. Compensation is a USD base plus, where listed, a proposed TBC allocation that has not been issued.">
        {jobs.length === 0 ? (
          <Card className="rounded-xl p-6 text-center">
            <Briefcase className="mx-auto h-5 w-5 text-[#d4af37]" />
            <p className="mt-2 text-sm font-semibold text-[#f0ecdd]">No public roles are open right now.</p>
            <p className="mt-1 text-xs text-[#8a8577]">Send a note to the team if you have relevant work to show. The board is updated when a role is approved for publication.</p>
            <GhostButton to="/contact" className="mt-4 border px-4 py-2.5 text-[#e9e7df]">Contact the team</GhostButton>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {jobs.map((j) => (
              <Card key={j.id} className="flex flex-col rounded-xl p-5">
                <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#d4af37]">{j.department} · {j.employmentType} · {j.location}</div>
                <h2 className="mt-1.5 text-lg font-semibold text-[#f0ecdd]">{j.title}</h2>
                <p className="mt-2 flex-1 whitespace-pre-line text-sm leading-relaxed text-[#8a8577]">{j.description}</p>
                {j.requirements && <p className="mt-2 text-xs leading-relaxed text-[#6e6a5e]">{t('job.requirements')}: {j.requirements}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-bold text-[#d4af37]">
                    {Number(j.hiring?.salary_tbc) > 0
                      ? `USD base + proposed TBC allocation (not issued) · ${j.hiring.salary_tbc} platform credit/mo`
                      : 'USD base + proposed TBC allocation (not issued)'}
                  </span>
                  {j.hiring?.closes_at && !Number.isNaN(Date.parse(j.hiring.closes_at)) && (
                    <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-300">{t('job.closesAt', null, 'Apply by')} {String(j.hiring.closes_at).slice(0, 10)}</span>
                  )}
                </div>
                <GhostButton onClick={() => { setOpenId(openId === j.id ? null : j.id); setDone(false); setApplyErr(''); }} className="mt-4 w-full justify-center border px-4 py-2.5 text-xs text-[#e9e7df]">{t('job.apply')}</GhostButton>
                {openId === j.id && (
                  done ? (
                    <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm text-emerald-400">{t('job.applied')}</p>
                  ) : (
                    <form onSubmit={apply} className="mt-3 space-y-2">
                      <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={t('job.namePh')} required className={field} />
                      <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder={t('job.emailPh')} type="email" required className={field} />
                      <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder={t('job.phonePh')} className={field} />
                      <textarea value={form.coverLetter} onChange={(e) => setForm((p) => ({ ...p, coverLetter: e.target.value }))} placeholder={t('job.coverPh')} className={`${field} min-h-[100px]`} />
                      {screeningQs.map((q, i) => (
                        <div key={i}>
                          <div className="mb-1 text-xs font-semibold text-[#d4af37]">{q?.q || `Question ${i + 1}`}{q?.required !== false ? ' *' : ''}</div>
                          <textarea value={form.answers[i] || ''} onChange={(e) => setForm((p) => ({ ...p, answers: { ...p.answers, [i]: e.target.value } }))} required={q?.required !== false} placeholder={t('job.answerPh', null, 'Your answer…')} className={`${field} min-h-[64px]`} />
                        </div>
                      ))}
                      <div>
                        <div className="mb-1 text-xs font-semibold text-[#d4af37]">{t('job.samplesPh', null, 'Links to your work (portfolio, profile, samples)')}{samplesRequired ? ' *' : ''}</div>
                        <textarea value={form.samples} onChange={(e) => setForm((p) => ({ ...p, samples: e.target.value }))} required={samplesRequired} placeholder="https://…" className={`${field} min-h-[56px]`} />
                      </div>
                      <div aria-hidden style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
                        <input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="Website" tabIndex={-1} autoComplete="off" />
                      </div>
                      {applyErr && <p className="rounded-xl border border-red-400/30 bg-red-400/5 p-2.5 text-center text-xs text-red-300">{applyErr}</p>}
                      <GoldButton disabled={busy} className="w-full justify-center">{t('job.sendApp')}</GoldButton>
                    </form>
                  )
                )}
              </Card>
            ))}
          </div>
        )}
      </PublicSection>
      <PublicSection eyebrow="Hiring standard" title="What we look for.">
        <PublicCheckList items={['Evidence of the work, not just a title', 'Clear written thinking and direct communication', 'Security and member trust treated as product requirements', 'Remote-first discipline with overlap for the team']} />
      </PublicSection>
      <PublicCTA title={<>No perfect résumé required. <span className="tb-gold-text">Show the work.</span></>} body="If a role is not listed, send a concise note with something you have built or shipped." primary="Contact the team" primaryTo="/contact" secondary="Read about us" secondaryTo="/about" />
    </PublicSiteShell>
  );
};

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export const ContactPage = () => {
  const { settings } = usePlatformSettings();
  const support = settings?.supportEmail || 'support@tradingbible.app';
  return (
    <PublicSiteShell>
      <PublicPageHead
        eyebrow="Company · Contact"
        title={<>A real route <span className="tb-gold-text">to a real person.</span></>}
        description="Use the route that fits the question. Support handles product and account issues, investor relations handles the TB record, and security handles responsible disclosure. We do not provide trade signals or personalised financial advice."
        meta={['Support', 'Investor relations', 'Security']}
        actions={<><GoldButton href={`mailto:${support}`}>Email support <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/faq" className="border px-5 py-3 text-[#e9e7df]">Read the FAQ</GhostButton></>}
      />
      <PublicSection eyebrow="Choose a route" title="Who to contact.">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            [Mail, 'Product & account support', 'Billing, access, broker sync, SI or a bug in the app.', support, `mailto:${support}`],
            [Briefcase, 'Investor relations', 'The TB record, shareholder verification, financials and IPO readiness. Public financial content is published only after approval.', 'investors@tradingbible.app', '/investors/contact'],
            [ShieldCheck, 'Security disclosure', 'Report a vulnerability or a suspected account compromise. Please do not include live credentials in the first message.', 'security@tradingbible.app', '/security'],
            [Users, 'Careers', 'Roles, applications and the hiring process. The job board is the source for open roles.', 'careers@tradingbible.app', '/careers'],
          ].map(([Icon, title, body, address, to]) => (
            <Card key={title} className="rounded-xl p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#d4af37]"><Icon className="h-4 w-4" /></span>
                <h2 className="text-base font-semibold text-[#f0ecdd]">{title}</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">{body}</p>
              {to.startsWith('/') ? (
                <Link to={to} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline">{address} <ArrowRight className="h-3.5 w-3.5" /></Link>
              ) : (
                <a href={to} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline">{address} <ArrowRight className="h-3.5 w-3.5" /></a>
              )}
            </Card>
          ))}
        </div>
      </PublicSection>
      <PublicSection eyebrow="Before you write" title="A useful message is a short record.">
        <PublicCheckList items={['The email on your TradingBible account, if the question is account-specific', 'The broker or route involved and the time it happened', 'What you expected and what you saw instead', 'A screenshot with sensitive values redacted', 'No passwords, API secrets or seed phrases']} />
        <div className="mt-3"><PublicNotice>We never ask for your broker password or API secret by email. If someone does, report it to security.</PublicNotice></div>
      </PublicSection>
      <PublicCTA eyebrow="Still stuck?" title={<>Ask a direct question. <span className="tb-gold-text">Get a direct answer.</span></>} body="Support is the fastest route for product issues. Investor questions go to the IR team." primary="Email support" primaryHref={`mailto:${support}`} secondary="Investor contact" secondaryTo="/investors/contact" />
    </PublicSiteShell>
  );
};
