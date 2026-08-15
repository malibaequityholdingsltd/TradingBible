import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Check, User, Building2, KeyRound, BookOpen, ShieldCheck, LineChart, Bot, Sparkles } from 'lucide-react';
import { MARKETS, EXPERIENCE, GOALS } from '@/lib/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
import { homeRouteForUser } from '@/lib/homeRoute';
import { readRefFromUrl, trackAffiliateSignup } from '@/lib/affiliate';
import { verifyTotpLogin, passkeyLogin, notifyLogin, accountReactivate } from '@/lib/security';

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

// ─── Layout ──────────────────────────────────────────────────────────

const HERO_LINES = [
  'Your edge is built one reviewed trade at a time.',
  'The coach that never sleeps — compounding your discipline.',
  'From first trade to funded: every step measured.',
];

const HERO_FEATURES = [
  { icon: LineChart, title: 'AI trade reviews', text: 'Every trade analyzed after the close.' },
  { icon: Bot, title: '24/7 AI coach', text: 'Ask anything, in your own words.' },
  { icon: ShieldCheck, title: 'Bank-grade security', text: 'Encrypted, backed up, always yours.' },
  { icon: Sparkles, title: 'Live Academy', text: 'AI-taught paths and weekly webinars.' },
];

function Shell({ children }) {
  return (
    <div className="auth-shell relative min-h-screen overflow-hidden px-3 pb-8 pt-[calc(4.75rem+var(--safe-top))] sm:px-6 sm:pb-12 sm:pt-[calc(6.5rem+var(--safe-top))]">
      <div className="absolute inset-0 grain opacity-30" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#d4af37]/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[34rem] w-[34rem] rounded-full bg-[#d4af37]/[0.06] blur-[150px]" />
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={LOGO} alt="TradingBible logo" className="h-10 w-10 rounded-lg object-contain gold-glow sm:h-11 sm:w-11" />
            <span className="text-base font-semibold sm:text-lg">Trading<span className="gold-text">Bible</span></span>
          </Link>
          <div className="hidden sm:block"><GuideButton /></div>
        </div>
        <div className="mt-8 grid items-center gap-10 lg:mt-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="hidden lg:block"><HeroPanel /></div>
          <div className="relative z-10 mx-auto w-full max-w-xl lg:max-w-none">{children}</div>
        </div>
      </div>
    </div>
  );
}

function HeroPanel() {
  return (
    <div>
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-4 py-1.5 text-xs font-medium tracking-wide text-[#d4af37]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d4af37]" />
        AI-POWERED TRADING TERMINAL
      </p>
      <h1 className="text-5xl font-extrabold leading-[0.98] tracking-tight">
        Trade like the <span className="gold-text">1%.</span><br />
        Journal like a <span className="gold-text">fund.</span>
      </h1>
      <div className="relative mt-6 h-10 max-w-md" aria-hidden="true">
        {HERO_LINES.map((line) => (
          <p key={line} className="auth-rotate-line text-base leading-5 text-[#b8b3a3]">{line}</p>
        ))}
      </div>
      <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
        {HERO_FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="shell-panel-soft rounded-2xl p-4 transition hover:border-[#d4af37]/25">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#d4af37]/12 text-[#d4af37]"><Icon className="h-4 w-4" /></div>
            <div className="mt-2.5 text-sm font-semibold text-[#e9e7df]">{title}</div>
            <div className="mt-1 text-xs leading-4 text-[#8a8577]">{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

// ─── Form primitives ─────────────────────────────────────────────────

const Field = ({ icon: Icon, ...p }) => (
  <div className="auth-field flex min-h-[44px] items-center gap-2.5 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3.5 py-2.5 focus-within:border-[#d4af37]/50 sm:min-h-[48px] sm:gap-3 sm:px-4 sm:py-3">
    <Icon className="auth-field-icon h-4 w-4 shrink-0 text-[#8a8577]" />
    <input {...p} className="auth-input w-full bg-transparent text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none sm:text-sm" />
  </div>
);

function OtpInput({ value, onChange, disabled, onComplete }) {
  const digits = normalizeOtpCode(value);
  const refs = useRef([]);
  const focusBox = (i) => refs.current[Math.max(0, Math.min(5, i))]?.focus();

  const setAt = (i, d) => {
    const next = `${digits.slice(0, i)}${d}${digits.slice(i + 1)}`.slice(0, 6);
    onChange(next);
    if (d) focusBox(i + 1);
  };

  useEffect(() => {
    if (digits.length === 6 && onComplete && !disabled) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handlePaste = (e) => {
    e.preventDefault();
    const text = String(e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (text) {
      onChange(text);
      focusBox(text.length - 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={digits[i] || ''}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of 6`}
          onPaste={handlePaste}
          onChange={(e) => setAt(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i]) { e.preventDefault(); focusBox(i - 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); focusBox(i - 1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); focusBox(i + 1); }
          }}
          className="auth-otp-box"
        />
      ))}
    </div>
  );
}

function AuthTabs({ mode }) {
  const base = 'grid h-10 min-h-[40px] place-items-center rounded-full text-sm font-semibold transition';
  const active = 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_8px_24px_-8px_rgba(212,175,55,0.6)]';
  const idle = 'text-[#8a8577] hover:text-[#e9e7df]';
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full border border-[#d4af37]/15 bg-white/[0.03] p-1">
      <Link to="/login" className={`${base} ${mode === 'login' ? active : idle}`}>Log in</Link>
      <Link to="/signup" className={`${base} ${mode === 'signup' ? active : idle}`}>Create account</Link>
    </div>
  );
}

function AuthFormFrame({ mode, title, subtitle, step, children, footer }) {
  return (
    <section className="auth-card glass relative overflow-hidden rounded-[1.5rem] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.24)] ring-1 ring-white/8 sm:rounded-[2rem] sm:p-6 lg:p-8">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#d4af37]/10 blur-3xl" />
      <div className="relative space-y-5 sm:space-y-6">
        <AuthTabs mode={mode} />
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[2rem]">{title}</h1>
            <p className="max-w-xl text-xs leading-5 text-[#b5b0a2] sm:text-sm">{subtitle}</p>
          </div>
          {step ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d4af37]">
              <Check className="h-3 w-3" />
              {step}
            </span>
          ) : null}
        </div>
        <div>{children}</div>
        {footer ? <div>{footer}</div> : null}
      </div>
    </section>
  );
}

const ProviderButtons = ({ busy, onGoogle, onApple }) => (
  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
    <button
      type="button"
      onClick={onGoogle}
      disabled={busy}
      aria-label="Continue with Google"
      className="flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.96] px-3 text-sm font-semibold text-[#121212] shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-[#d4af37]/40 hover:shadow-[0_14px_36px_rgba(212,175,55,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleLogo />
      <span className="hidden xs:inline sm:inline">Google</span>
    </button>
    <button
      type="button"
      onClick={onApple}
      disabled={busy}
      aria-label="Continue with Apple"
      className="flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#111113] px-3 text-sm font-semibold text-[#f5f5f7] shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-[#d4af37]/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <AppleLogo />
      <span className="hidden xs:inline sm:inline">Apple</span>
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

// ─── Pages ───────────────────────────────────────────────────────────

export function LoginPage() {
  const nav = useNavigate();
  const { requestOTP, loginWithCode, loginWithProvider, user, isAuthed, isAuthReady, logout } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState('');
  const [sent, setSent] = useState(false);
  const [needTotp, setNeedTotp] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const finishLogin = (auth) => {
    notifyLogin();
    nav(homeRouteForUser(auth?.record), { replace: true });
  };

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
    e?.preventDefault?.();
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
      await requestOTP({ email: email.trim(), shouldCreateUser: true });
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

  const verifyCode = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    const token = normalizeOtpCode(code);
    if (!email.trim() || token.length !== 6) {
      toast({ variant: 'destructive', title: 'Enter your 6-digit code', description: 'Check the email code and try again.' });
      return;
    }
    setBusy(true);
    try {
      const auth = await loginWithCode(email.trim(), token);
      const account = auth?.record?.user_settings?.account;
      if (account?.status === 'closed') {
        await logout?.();
        toast({ variant: 'destructive', title: 'This account has been closed', description: 'Your data is retained per our legal obligations. Contact support if you believe this is an error.' });
        return;
      }
      if (account?.status === 'deactivated') {
        await accountReactivate();
      }
      const totp = auth?.record?.user_settings?.totp;
      if (totp?.enabled) {
        setPendingAuth(auth);
        setSent(false);
        setNeedTotp(true);
        toast({ title: 'Authenticator code required', description: 'Enter the 6-digit code from your authenticator app.' });
        return;
      }
      finishLogin(auth);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Invalid code', description: describeAuthError(err, 'Please request a new code and try again.') });
    } finally { setBusy(false); }
  };

  const verifyTotpStep = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    const token = normalizeOtpCode(totpCode);
    if (token.length !== 6) {
      toast({ variant: 'destructive', title: 'Enter your 6-digit code', description: 'Check your authenticator app and try again.' });
      return;
    }
    setBusy(true);
    try {
      await verifyTotpLogin(token);
      finishLogin(pendingAuth);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Invalid authenticator code', description: String(err?.message || 'Please try again.') });
    } finally { setBusy(false); }
  };

  const signInWithPasskey = async () => {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      toast({ variant: 'destructive', title: 'Enter your email address', description: 'We need your email to look up your passkey.' });
      return;
    }
    setPasskeyBusy(true);
    try {
      const result = await passkeyLogin(normalized);
      if (!result?.otp) throw new Error('Session could not be created. Please sign in with your email code.');
      const auth = await loginWithCode(result.email, result.otp);
      const account = auth?.record?.user_settings?.account;
      if (account?.status === 'closed') {
        await logout?.();
        toast({ variant: 'destructive', title: 'This account has been closed', description: 'Your data is retained per our legal obligations. Contact support if you believe this is an error.' });
        return;
      }
      if (account?.status === 'deactivated') {
        await accountReactivate();
      }
      finishLogin(auth);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Face ID / passkey sign-in failed', description: String(err?.message || 'Please try again.') });
    } finally { setPasskeyBusy(false); }
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
        mode="login"
        title={needTotp ? 'Two-step verification' : (sent ? 'Check your inbox' : 'Welcome back')}
        subtitle={needTotp
          ? 'Your account is protected with an authenticator app. Enter the current 6-digit code to continue.'
          : (sent
            ? `We emailed a 6-digit code to ${email || 'your inbox'}. Enter it below to sign in.`
            : 'Use Google, Apple, or your email code to get back to your terminal.')}
        step={needTotp ? 'Step 2 of 2' : (sent ? 'Step 2 of 2' : 'Step 1 of 2')}
        footer={
          <p className="mt-5 text-center text-sm text-[#8a8577]">
            New to TradingBible? <Link to="/signup" className="font-medium text-[#d4af37] hover:underline">Create an account</Link>
          </p>
        }
      >
        <div className="rounded-[1.25rem] border border-[#d4af37]/14 bg-gradient-to-b from-white/[0.06] to-transparent p-3 sm:rounded-[1.5rem] sm:p-4">
          <ProviderButtons busy={oauthBusy} onGoogle={() => startOAuth('google')} onApple={() => startOAuth('apple')} />
        </div>
        <form className="mt-4 space-y-3 sm:mt-5 sm:space-y-3.5" onSubmit={needTotp ? verifyTotpStep : (sent ? verifyCode : sendCode)}>
          {!needTotp && <Field icon={Mail} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />}
          {!needTotp && sent && (
            <div className="space-y-2.5">
              <OtpInput
                value={code}
                disabled={busy}
                onChange={setCode}
                onComplete={() => verifyCode()}
              />
              <p className="text-center text-[11px] text-[#8a8577]">Didn’t get it? Check spam or resend below.</p>
            </div>
          )}
          {needTotp && (
            <OtpInput
              value={totpCode}
              disabled={busy}
              onChange={setTotpCode}
              onComplete={() => verifyTotpStep()}
            />
          )}
          <button disabled={busy || (!needTotp && !sent && cooldownSeconds > 0)} className={`${goldBtn} btn-spotlight`}>{busy ? 'Please wait…' : (needTotp ? 'Verify authenticator code' : (sent ? 'Verify & sign in' : 'Send one-time code'))} <ArrowRight className="h-4 w-4" /></button>
        </form>
        {needTotp && <div className="mt-3 text-center text-xs sm:mt-4"><button type="button" disabled={busy} onClick={() => { setNeedTotp(false); setTotpCode(''); setPendingAuth(null); }} className="text-[#8a8577] hover:text-[#d4af37]">Back to email code</button></div>}
        {!needTotp && sent && <div className="mt-3 text-center text-xs sm:mt-4"><button type="button" disabled={busy || cooldownSeconds > 0} onClick={sendCode} className="text-[#8a8577] hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60">{cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend code'}</button></div>}
        {!needTotp && cooldownSeconds > 0 && <p className="mt-2 text-center text-xs text-[#8a8577]">To protect your account, new code requests are limited. Try again in {formatCooldownDuration(cooldownSeconds)}.</p>}
        {!needTotp && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] uppercase tracking-widest text-[#8a8577]">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        )}
        {!needTotp && (
          <button
            type="button"
            disabled={passkeyBusy}
            onClick={signInWithPasskey}
            className="mt-1.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium text-[#e9e7df] transition hover:border-[#d4af37]/40 hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passkeyBusy ? 'Verifying…' : <><ShieldCheck className="h-4 w-4" /> Face ID / passkey sign-in</>}
          </button>
        )}
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

  useEffect(() => {
    readRefFromUrl();
  }, []);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
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
        trackAffiliateSignup(readRefFromUrl(), email.trim());
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
        mode="signup"
        title={sent ? 'Almost there' : 'Create your account'}
        subtitle={sent
          ? `We emailed a 6-digit code to ${email || 'your inbox'}. Enter it to activate your account.`
          : 'Start with Google or Apple for a faster setup — or use your email code.'}
        step={sent ? 'Step 2 of 2' : 'Step 1 of 2'}
        footer={
          <p className="mt-5 text-center text-sm text-[#8a8577]">
            Already have an account? <Link to="/login" className="font-medium text-[#d4af37] hover:underline">Log in</Link>
          </p>
        }
      >
        <div className="rounded-[1.25rem] border border-[#d4af37]/14 bg-gradient-to-b from-white/[0.06] to-transparent p-3 sm:rounded-[1.5rem] sm:p-4">
          <ProviderButtons busy={oauthBusy} onGoogle={() => startOAuth('google')} onApple={() => startOAuth('apple')} />
        </div>
        <form className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3" onSubmit={submit}>
          {!sent && (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#d4af37]/15 p-1">
                {[
                  { id: 'individual', label: 'Individual', icon: User },
                  { id: 'company', label: 'Company / School', icon: Building2 },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAccountType(id)}
                    className={`flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-2.5 text-sm transition sm:min-h-[42px] sm:px-3 ${accountType === id ? 'bg-[#d4af37]/14 text-[#f0ecdd]' : 'text-[#8a8577] hover:bg-white/5'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              <Field icon={User} type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              {accountType === 'company' && (
                <Field icon={Building2} type="text" placeholder="Company or School name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              )}
              <Field icon={Mail} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <p className="text-center text-xs text-[#8a8577]">We’ll send both a 6-digit code and a sign-in link to your inbox.</p>
            </>
          )}
          {sent && (
            <OtpInput
              value={code}
              disabled={busy}
              onChange={setCode}
              onComplete={() => submit()}
            />
          )}
          <button disabled={busy || (!sent && cooldownSeconds > 0)} className={`${goldBtn} btn-spotlight`}>{busy ? 'Please wait…' : (sent ? 'Verify & continue' : 'Send one-time code')} <ArrowRight className="h-4 w-4" /></button>
        </form>
        {sent && <div className="mt-3 text-center text-xs sm:mt-4"><button type="button" disabled={busy || cooldownSeconds > 0} onClick={resend} className="text-[#8a8577] hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60">{cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend code'}</button></div>}
        {cooldownSeconds > 0 && <p className="mt-2 text-center text-xs text-[#8a8577]">To protect your account, new code requests are limited. Try again in {formatCooldownDuration(cooldownSeconds)}.</p>}
      </AuthFormFrame>
    </Shell>
  );
}

export function ResetPage() {
  return <Navigate to="/login" replace />;
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
