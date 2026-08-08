import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Check, User, Building2, KeyRound, Lock, BookOpen } from 'lucide-react';
import { MARKETS, EXPERIENCE, GOALS } from '@/lib/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
import { homeRouteForUser } from '@/lib/homeRoute';

const LOGO = TRADINGBIBLE_LOGO;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_GLOBAL_COOLDOWN_KEY = 'tb:otp:global-cooldown';
const OTP_RATE_LIMIT_FALLBACK_SECONDS = 15 * 60;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function otpCooldownKey(email) {
  return `tb:otp:cooldown:${normalizeEmail(email)}`;
}

function readOtpCooldownUntil(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || typeof window === 'undefined') return 0;
  const key = otpCooldownKey(normalizedEmail);
  const raw = window.localStorage.getItem(key);
  const parsed = Number(raw || 0);
  if (!Number.isFinite(parsed) || parsed <= Date.now()) {
    window.localStorage.removeItem(key);
    return 0;
  }
  return parsed;
}

function readGlobalOtpCooldownUntil() {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(OTP_GLOBAL_COOLDOWN_KEY);
  const parsed = Number(raw || 0);
  if (!Number.isFinite(parsed) || parsed <= Date.now()) {
    window.localStorage.removeItem(OTP_GLOBAL_COOLDOWN_KEY);
    return 0;
  }
  return parsed;
}

function writeOtpCooldownUntil(email, untilTs) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || typeof window === 'undefined') return;
  window.localStorage.setItem(otpCooldownKey(normalizedEmail), String(untilTs));
}

function writeGlobalOtpCooldownUntil(untilTs) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OTP_GLOBAL_COOLDOWN_KEY, String(untilTs));
}

function parseRetryAfterSeconds(err) {
  const message = String(err?.message || '');
  const secondsMatch = message.match(/after\s+(\d+)\s+seconds?/i);
  if (secondsMatch) return Number(secondsMatch[1]);
  const minutesMatch = message.match(/after\s+(\d+)\s+minutes?/i);
  if (minutesMatch) return Number(minutesMatch[1]) * 60;
  const hoursMatch = message.match(/after\s+(\d+)\s+hours?/i);
  if (hoursMatch) return Number(hoursMatch[1]) * 60 * 60;
  if (/email rate limit exceeded/i.test(message)) return OTP_RATE_LIMIT_FALLBACK_SECONDS;
  return OTP_COOLDOWN_SECONDS;
}

function formatCooldownDuration(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m${remainingSeconds ? ` ${remainingSeconds}s` : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ''}${remainingSeconds ? ` ${remainingSeconds}s` : ''}`;
}

function normalizeOtpCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

function isOtpRateLimited(err) {
  const message = String(err?.message || '');
  const code = String(err?.code || '');
  return code === 'over_email_send_rate_limit' || /request this after/i.test(message) || err?.status === 429;
}

function describeAuthError(err, fallback = 'Please try again.') {
  const message = String(err?.message || '');
  const code = String(err?.code || '');

  if (code === 'over_email_send_rate_limit' || /request this after/i.test(message)) {
    return message || 'Please wait before requesting another code.';
  }
  if (/email rate limit exceeded/i.test(message)) {
    return `Too many code requests were sent recently. Please wait ${formatCooldownDuration(OTP_RATE_LIMIT_FALLBACK_SECONDS)}, then try again.`;
  }
  if (code === 'otp_disabled' || /email provider is disabled/i.test(message)) {
    return 'Email code login is currently unavailable. Please contact support.';
  }
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Invalid or expired code. Request a new code and try again.';
  }
  if (code === 'user_not_found' || /user not found/i.test(message)) {
    return 'No account found for that email. Please create an account first.';
  }

  return message || fallback;
}

function Shell({ children }) {
  return (
    <div className="auth-shell relative min-h-screen overflow-hidden px-4 pb-10 pt-[calc(5.75rem+var(--safe-top))] sm:px-6 sm:pb-12 sm:pt-[calc(6.5rem+var(--safe-top))]">
      <div className="absolute inset-0 grain opacity-30" />
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
       <Link to="/" className="flex items-center gap-2.5">
          <img src={LOGO} alt="TradingBible logo" className="h-11 w-11 rounded-lg object-contain gold-glow" />
          <span className="text-lg font-semibold">Trading<span className="gold-text">Bible</span></span>
        </Link>
       <GuideButton />
      </div>
      <div className="relative z-10 mt-6">
       {children}
      </div>
    </div>
  );
}

const Field = ({ icon: Icon, ...p }) => (
  <div className="auth-field flex min-h-[48px] items-center gap-3 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 focus-within:border-[#d4af37]/50">
    <Icon className="auth-field-icon h-4 w-4 shrink-0 text-[#8a8577]" />
    <input {...p} className="auth-input w-full bg-transparent text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none" />
  </div>
);

const ProviderButtons = ({ busy, onGoogle, onApple }) => (
  <div className="mt-4 flex items-center justify-center gap-3">
    <button
      type="button"
      onClick={onGoogle}
      disabled={busy}
      aria-label="Google sign-in"
      title="Google sign-in"
      className="group relative grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.96] text-[#121212] shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-[#d4af37]/40 hover:shadow-[0_14px_36px_rgba(212,175,55,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#4285F4] shadow-sm ring-1 ring-black/5">
        <GoogleLogo />
      </span>
    </button>
    <button
      type="button"
      onClick={onApple}
      disabled={busy}
      aria-label="Apple sign-in"
      title="Apple sign-in"
      className="group relative grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-[#111113] text-[#f5f5f7] shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-[#d4af37]/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white shadow-sm ring-1 ring-white/10">
        <AppleLogo />
      </span>
    </button>
  </div>
);

const goldBtn = 'flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-3 font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60';

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
      <path fill="#EA4335" d="M24 19.6v8h11.3c-.5 2.7-2 5-4.2 6.6l6.8 5.3c4-3.7 6.3-9.1 6.3-15.5 0-1.5-.1-2.6-.4-4.4H24z" />
      <path fill="#34A853" d="M11.5 28.5 10.8 29l-7.1 5.5C7.5 42.8 15 48 24 48c6.1 0 11.3-2 15-5.4l-6.8-5.3c-1.9 1.3-4.4 2.1-7.2 2.1-5.6 0-10.3-3.8-12-8.9l-.1.1z" />
      <path fill="#FBBC05" d="M3.7 15.8 10.8 21l.3-.1c1.8-5.2 6.5-8.9 12.1-8.9 3 0 5.8 1 7.9 2.9l6-6C33.3 4.5 28.9 2.7 24 2.7 15.7 2.7 8.5 7.5 3.7 15.8z" />
      <path fill="#4285F4" d="M24 9.5c3.3 0 6.2 1.1 8.6 3.2l6.4-6.4C35.3 2.6 30.2 0 24 0 15.7 0 8.5 4.8 3.7 13.1l7.1 5.5C12.8 13.5 17.8 9.5 24 9.5z" opacity=".001" />
      <path fill="#4285F4" d="M24 19.6v8H35.3c-.5 2.7-2 5-4.2 6.6l6.8 5.3c4-3.7 6.3-9.1 6.3-15.5 0-1.5-.1-2.6-.4-4.4H24z" opacity=".001" />
      <path fill="#4285F4" d="M24 19.6v8h11.3c-.5 2.7-2 5-4.2 6.6l6.8 5.3c4-3.7 6.3-9.1 6.3-15.5 0-1.5-.1-2.6-.4-4.4H24z" opacity=".001" />
      <path fill="#4285F4" d="M24 19.6v8h11.3c-.5 2.7-2 5-4.2 6.6l6.8 5.3c4-3.7 6.3-9.1 6.3-15.5 0-1.5-.1-2.6-.4-4.4H24z" opacity=".001" />
      <path fill="#4285F4" d="M24 48c6.1 0 11.3-2 15-5.4l-6.8-5.3c-1.9 1.3-4.4 2.1-7.2 2.1-5.6 0-10.3-3.8-12-8.9l-.1.1L3.7 41.3C8.5 44.8 15.7 48 24 48z" opacity=".001" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M16.7 12.8c.1 2.9 2.5 3.9 2.5 3.9-.3.8-.8 1.5-1.3 2.2-.7 1-1.4 2-2.5 2.1-1 .1-1.4-.6-2.6-.6s-1.7.6-2.7.6c-1.1 0-1.9-1-2.6-2-1.7-2.5-3-7.1-1.2-10.2.8-1.3 2.1-2.1 3.6-2.1 1.1 0 2.2.8 2.8.8.7 0 2-.9 3.4-.8.6 0 2.5.2 3.7 1.9-.1.1-2.2 1.3-2.1 4.2ZM14.5 3.9c.5-.7.8-1.7.7-2.7-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.7-1 2.7 1.1.1 2.2-.6 3.1-1.5Z" />
    </svg>
  );
}

const AuthChip = ({ value, label }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
    <div className="text-lg font-bold text-white">{value}</div>
    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#8a8577]">{label}</div>
  </div>
);

function GuideButton() {
  return (
    <Link
      to="/guides"
      className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-4 py-2 text-sm font-medium text-[#d4af37] transition hover:border-[#d4af37]/50 hover:bg-[#d4af37]/15"
    >
      <BookOpen className="h-4 w-4" />
      Guide
    </Link>
  );
}

function AuthFormFrame({ eyebrow, title, subtitle, stats, children, footer }) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <section className="auth-card glass relative overflow-hidden rounded-[2rem] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.24)] ring-1 ring-white/8 sm:p-6 lg:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              {eyebrow ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#d4af37]">
                  <Check className="h-3.5 w-3.5" />
                  {eyebrow}
                </span>
              ) : null}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-[2.35rem]">{title}</h1>
                <p className="max-w-xl text-sm leading-6 text-[#b5b0a2] sm:text-[15px]">{subtitle}</p>
              </div>
            </div>
          </div>
          {stats?.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => <AuthChip key={stat.value} value={stat.value} label={stat.label} />)}
            </div>
          ) : null}
          <div>{children}</div>
          {footer ? <div>{footer}</div> : null}
        </div>
      </section>
    </div>
  );
}

export function LoginPage() {
  const nav = useNavigate();
  const { requestOTP, loginWithCode, loginWithPassword, loginWithProvider, user, isAuthed, isAuthReady } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState('otp');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (isAuthReady && isAuthed) {
      nav(homeRouteForUser(user), { replace: true });
    }
  }, [isAuthReady, isAuthed, nav, user]);

  useEffect(() => {
    const existing = Math.max(readOtpCooldownUntil(email), readGlobalOtpCooldownUntil());
    setCooldownUntil(existing);
  }, [email]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return undefined;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) setCooldownUntil(0);
    };
    update();
    const timer = window.setInterval(() => {
      update();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const sendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ variant: 'destructive', title: 'Enter your email address', description: 'We need your email to send a code.' });
      return;
    }
    if (cooldownSeconds > 0) {
      toast({ title: 'Please wait', description: `You can request another code in ${formatCooldownDuration(cooldownSeconds)}.` });
      return;
    }
    setBusy(true);
    try {
      await requestOTP({ email: email.trim(), shouldCreateUser: false });
      const until = Date.now() + OTP_COOLDOWN_SECONDS * 1000;
      writeOtpCooldownUntil(email, until);
      setCooldownUntil(until);
      setSent(true);
      toast({ title: 'One-time code sent', description: 'Check your email inbox for the verification code.' });
    } catch (err) {
      if (isOtpRateLimited(err)) {
        const waitFor = parseRetryAfterSeconds(err);
        const until = Date.now() + waitFor * 1000;
        writeOtpCooldownUntil(email, until);
        writeGlobalOtpCooldownUntil(until);
        setCooldownUntil(until);
        setSent(true);
      }
      toast({ variant: 'destructive', title: 'Could not send code', description: describeAuthError(err, 'Please try again.') });
    } finally { setBusy(false); }
  };

  const loginWithPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ variant: 'destructive', title: 'Enter your email and password', description: 'Both fields are required to sign in.' });
      return;
    }
    setBusy(true);
    try {
      const auth = await loginWithPassword(email.trim(), password);
      nav(homeRouteForUser(auth?.record));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not sign in', description: describeAuthError(err, 'Invalid email or password.') });
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    const token = normalizeOtpCode(code);
    if (!email.trim() || token.length !== 6) {
      toast({ variant: 'destructive', title: 'Enter your 6-digit code', description: 'Check the email code and try again.' });
      return;
    }
    setBusy(true);
    try {
      const auth = await loginWithCode(email.trim(), token);
      nav(homeRouteForUser(auth?.record));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Invalid code', description: describeAuthError(err, 'Please request a new code and try again.') });
    } finally { setBusy(false); }
  };

  const startOAuth = async (provider) => {
    setOauthBusy(provider);
    try {
      await loginWithProvider(provider);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: `Could not start ${provider === 'google' ? 'Google' : 'Apple'} sign-in`,
        description: describeAuthError(err, 'Please try again.'),
      });
      setOauthBusy('');
    }
  };

  return (
    <Shell>
      <AuthFormFrame
        eyebrow=""
        title="Log in"
        subtitle="Choose a sign-in method and continue."
        stats={[]}
      >
        <div className="rounded-[1.5rem] border border-[#d4af37]/14 bg-gradient-to-b from-white/[0.06] to-transparent p-4">
          <ProviderButtons busy={oauthBusy} onGoogle={() => startOAuth('google')} onApple={() => startOAuth('apple')} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#d4af37]/15 p-1">
          <button
            type="button"
            onClick={() => setMethod('otp')}
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-3 text-sm transition ${method === 'otp' ? 'bg-[#d4af37]/14 text-[#f0ecdd]' : 'text-[#8a8577] hover:bg-white/5'}`}
          >
            <KeyRound className="h-4 w-4" />
            One-time code
          </button>
          <button
            type="button"
            onClick={() => setMethod('password')}
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-3 text-sm transition ${method === 'password' ? 'bg-[#d4af37]/14 text-[#f0ecdd]' : 'text-[#8a8577] hover:bg-white/5'}`}
          >
            <Lock className="h-4 w-4" />
            Password
          </button>
        </div>
        <form className="mt-5 space-y-3" onSubmit={method === 'password' ? loginWithPasswordSubmit : (sent ? verifyCode : sendCode)}>
          <Field icon={Mail} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          {method === 'password' && (
            <Field icon={Lock} type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          )}
          {method === 'otp' && sent && (
            <Field icon={KeyRound} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter your email code (6 digits)" value={code} onChange={(e) => setCode(normalizeOtpCode(e.target.value))} required />
          )}
          <button disabled={busy || (method === 'otp' && !sent && cooldownSeconds > 0)} className={goldBtn}>{busy ? 'Please wait…' : (method === 'password' ? 'Sign in' : (sent ? 'Verify code' : 'Send one-time code'))} <ArrowRight className="h-4 w-4" /></button>
        </form>
        {method === 'otp' && sent && <div className="mt-4 text-center text-xs"><button type="button" disabled={busy || cooldownSeconds > 0} onClick={sendCode} className="auth-muted text-[#8a8577] hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60">{cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend code'}</button></div>}
        {method === 'password' && <p className="mt-4 text-center text-xs text-[#8a8577]">Forgot your password? <Link to="/reset" className="text-[#d4af37] hover:underline">Reset it here</Link>.</p>}
        {method === 'otp' && cooldownSeconds > 0 && <p className="mt-2 text-center text-xs text-[#8a8577]">To protect your account, new code requests are limited. Try again in {formatCooldownDuration(cooldownSeconds)}.</p>}
        <p className="auth-muted mt-6 text-center text-sm text-[#8a8577]">New to TradingBible? <Link to="/signup" className="text-[#d4af37] hover:underline">Create an account</Link></p>
      </AuthFormFrame>
    </Shell>
  );
}

export function SignupPage() {
  const nav = useNavigate();
  const { requestOTP, loginWithCode, loginWithProvider, user, isAuthed, isAuthReady } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [accountType, setAccountType] = useState('individual');
  const [companyName, setCompanyName] = useState('');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (isAuthReady && isAuthed) {
      nav(homeRouteForUser(user), { replace: true });
    }
  }, [isAuthReady, isAuthed, nav, user]);

  useEffect(() => {
    const existing = Math.max(readOtpCooldownUntil(email), readGlobalOtpCooldownUntil());
    setCooldownUntil(existing);
  }, [email]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return undefined;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) setCooldownUntil(0);
    };
    update();
    const timer = window.setInterval(() => {
      update();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const submit = async (e) => {
    e.preventDefault();
    if (!sent && cooldownSeconds > 0) {
      toast({ title: 'Please wait', description: `You can request another code in ${formatCooldownDuration(cooldownSeconds)}.` });
      return;
    }
    setBusy(true);
    try {
      if (!sent) {
        await requestOTP({
          email: email.trim(),
          shouldCreateUser: true,
          username: username.trim() || email.split('@')[0],
          role: 'user',
          accountType,
          companyName: companyName.trim(),
        });
        const until = Date.now() + OTP_COOLDOWN_SECONDS * 1000;
        writeOtpCooldownUntil(email, until);
        setCooldownUntil(until);
        setSent(true);
        toast({ title: 'One-time code sent', description: 'Check your email for the code to finish account creation.' });
        return;
      }
      const token = normalizeOtpCode(code);
      if (token.length !== 6) {
        toast({ variant: 'destructive', title: 'Enter your 6-digit code', description: 'Check the email code and try again.' });
        return;
      }
      const auth = await loginWithCode(email.trim(), token);
      nav(homeRouteForUser(auth?.record));
    } catch (err) {
      if (!sent && isOtpRateLimited(err)) {
        const waitFor = parseRetryAfterSeconds(err);
        const until = Date.now() + waitFor * 1000;
        writeOtpCooldownUntil(email, until);
        writeGlobalOtpCooldownUntil(until);
        setCooldownUntil(until);
        setSent(true);
      }
      toast({ variant: 'destructive', title: sent ? 'Invalid code' : 'Could not send code', description: describeAuthError(err, 'Please try again.') });
    } finally { setBusy(false); }
  };

  const startOAuth = async (provider) => {
    setOauthBusy(provider);
    try {
      await loginWithProvider(provider);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: `Could not start ${provider === 'google' ? 'Google' : 'Apple'} sign-in`,
        description: describeAuthError(err, 'Please try again.'),
      });
      setOauthBusy('');
    }
  };

  const resend = async () => {
    if (cooldownSeconds > 0) {
      toast({ title: 'Please wait', description: `You can request another code in ${formatCooldownDuration(cooldownSeconds)}.` });
      return;
    }
    setBusy(true);
    try {
      await requestOTP({
        email: email.trim(),
        shouldCreateUser: true,
        username: username.trim() || email.split('@')[0],
        accountType,
        companyName: companyName.trim(),
      });
      const until = Date.now() + OTP_COOLDOWN_SECONDS * 1000;
      writeOtpCooldownUntil(email, until);
      setCooldownUntil(until);
      toast({ title: 'Code resent' });
    } catch (err) {
      if (isOtpRateLimited(err)) {
        const waitFor = parseRetryAfterSeconds(err);
        const until = Date.now() + waitFor * 1000;
        writeOtpCooldownUntil(email, until);
        writeGlobalOtpCooldownUntil(until);
        setCooldownUntil(until);
      }
      toast({ variant: 'destructive', title: 'Could not resend code', description: describeAuthError(err, 'Please try again.') });
    } finally { setBusy(false); }
  };

  return (
    <Shell>
      <AuthFormFrame
        eyebrow="Join TradingBible"
        title="Create your account"
        subtitle="Start with Google or Apple for a faster setup, then finish with your email code."
        stats={[
          { value: '7-day', label: 'Premium trial' },
          { value: '2 paths', label: 'Individual / company' },
          { value: '6 digits', label: 'Secure code' },
        ]}
      >
        <div className="rounded-[1.5rem] border border-[#d4af37]/14 bg-gradient-to-b from-white/[0.06] to-transparent p-4">
          <ProviderButtons busy={oauthBusy} onGoogle={() => startOAuth('google')} onApple={() => startOAuth('apple')} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#d4af37]/15 p-1">
          {[
            { id: 'individual', label: 'Individual', icon: User },
            { id: 'company', label: 'Company / School', icon: Building2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAccountType(id)}
              className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-3 text-sm transition ${accountType === id ? 'bg-[#d4af37]/14 text-[#f0ecdd]' : 'text-[#8a8577] hover:bg-white/5'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <Field icon={User} type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          {accountType === 'company' && (
            <Field icon={Building2} type="text" placeholder="Company or School name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          )}
          <Field icon={Mail} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          {sent && (
            <Field icon={KeyRound} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter your email code (6 digits)" value={code} onChange={(e) => setCode(normalizeOtpCode(e.target.value))} required />
          )}
          <button disabled={busy || (!sent && cooldownSeconds > 0)} className={goldBtn}>{busy ? 'Please wait…' : (sent ? 'Verify code & continue' : 'Send one-time code')} <ArrowRight className="h-4 w-4" /></button>
        </form>
        {sent && <div className="mt-4 text-center text-xs"><button type="button" disabled={busy || cooldownSeconds > 0} onClick={resend} className="auth-muted text-[#8a8577] hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60">{cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend code'}</button></div>}
        {cooldownSeconds > 0 && <p className="mt-2 text-center text-xs text-[#8a8577]">To protect your account, new code requests are limited. Try again in {formatCooldownDuration(cooldownSeconds)}.</p>}
        <p className="auth-muted mt-6 text-center text-sm text-[#8a8577]">Already have an account? <Link to="/login" className="text-[#d4af37] hover:underline">Log in</Link></p>
      </AuthFormFrame>
    </Shell>
  );
}

export function ResetPage() {
  const nav = useNavigate();
  const { requestReset, completePasswordReset, user, isAuthed, isAuthReady } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const sendReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ variant: 'destructive', title: 'Enter your email address', description: 'We need your email to send a reset link.' });
      return;
    }
    setBusy(true);
    try {
      await requestReset(email.trim());
      toast({ title: 'Reset link sent', description: 'Check your inbox for the password reset link.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not send reset link', description: describeAuthError(err, 'Please try again.') });
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Use at least 8 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Please enter the same password twice.' });
      return;
    }
    setBusy(true);
    try {
      await completePasswordReset(password);
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      nav(homeRouteForUser(user), { replace: true });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not update password', description: describeAuthError(err, 'Please try again.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-md">
      <div className="auth-card glass rounded-2xl p-6 sm:p-7">
        {isAuthReady && isAuthed ? (
          <>
            <h1 className="text-center text-2xl font-bold">Set a new password</h1>
            <p className="auth-muted mt-1 text-center text-sm text-[#8a8577]">Choose a strong password for your TradingBible account.</p>
            <form className="mt-5 space-y-3" onSubmit={updatePassword}>
              <Field icon={Lock} type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
              <Field icon={Lock} type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
              <button disabled={busy} className={goldBtn}>{busy ? 'Please wait…' : 'Update password'} <ArrowRight className="h-4 w-4" /></button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-center text-2xl font-bold">Reset your password</h1>
            <p className="auth-muted mt-1 text-center text-sm text-[#8a8577]">We&apos;ll email a secure reset link to your inbox.</p>
            <form className="mt-5 space-y-3" onSubmit={sendReset}>
              <Field icon={Mail} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <button disabled={busy} className={goldBtn}>{busy ? 'Please wait…' : 'Send reset link'} <ArrowRight className="h-4 w-4" /></button>
            </form>
            <p className="mt-4 text-center text-xs text-[#8a8577]">After opening the email link, you&apos;ll return here to choose a new password.</p>
          </>
        )}
        <p className="auth-muted mt-6 text-center text-sm text-[#8a8577]"><Link to="/login" className="text-[#d4af37] hover:underline">Back to login</Link></p>
      </div>
      </div>
    </Shell>
  );
}

const Group = ({ title, options, value, onChange }) => (
  <div>
    <p className="mb-2 text-sm font-medium text-[#c9c4b4]">{title}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={`min-h-[44px] rounded-lg border px-3.5 py-2 text-sm transition ${value === o ? 'border-[#d4af37] bg-[#d4af37]/12 text-[#f0ecdd]' : 'border-[#d4af37]/15 text-[#8a8577] hover:border-[#d4af37]/40'}`}>{o}</button>
      ))}
    </div>
  </div>
);

export function OnboardingPage() {
  const nav = useNavigate();
  const { updateProfile } = useAuth();
  const [market, setMarket] = useState('Forex');
  const [exp, setExp] = useState('Intermediate');
  const [goal, setGoal] = useState('Discipline');
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    try {
      await updateProfile({ primaryMarket: market, experience: exp, goal });
      nav('/app/brokers');
    } catch (err) {
      nav('/app/brokers');
      console.error('Onboarding save failed:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-md">
      <div className="auth-card glass rounded-2xl p-6 sm:p-7">
        <h1 className="text-2xl font-bold">Tailor your terminal</h1>
        <p className="auth-muted mt-1 text-sm text-[#8a8577]">Three quick questions. Your trial starts now.</p>
        <div className="mt-6 space-y-6">
          <Group title="Primary market" options={MARKETS} value={market} onChange={setMarket} />
          <Group title="Experience level" options={EXPERIENCE} value={exp} onChange={setExp} />
          <Group title="Main goal" options={GOALS} value={goal} onChange={setGoal} />
        </div>
        <button onClick={finish} disabled={busy} className={`${goldBtn} mt-8`}>Connect your brokers <ArrowRight className="h-4 w-4" /></button>
      </div>
      </div>
    </Shell>
  );
}
