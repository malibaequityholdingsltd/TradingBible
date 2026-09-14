import { createTransport } from 'nodemailer';
import { Webhook, WebhookVerificationError } from 'standardwebhooks';
import { brandShell, tokenBlock, buttonLink } from '../utils/email-brand.js';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
const smtpFromName = process.env.SMTP_FROM_NAME || 'TradingBible';
const hookSecret = process.env.SEND_EMAIL_HOOK_SECRET || '';

const transporter = smtpHost && smtpPort && smtpUser && smtpPass
  ? createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort === 587,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null;

const webhook = hookSecret ? new Webhook(hookSecret.replace(/^v1,whsec_/, '')) : null;

function getMailCopy(emailData = {}) {
  const action = String(emailData.email_action_type || '').toLowerCase();
  const token = String(emailData.token || '');
  const confirmationUrl = String(emailData.confirmation_url || emailData.confirmationURL || '');

  if (action === 'signup') {
    return {
      subject: 'Confirm your TradingBible email',
      title: 'Confirm your email address',
      body: `
        <p>Welcome to TradingBible. Confirm your email to activate your account.</p>
        ${token ? `<p style="margin:18px 0 8px;font-weight:600">Use this 6-digit code:</p>${tokenBlock(token)}` : ''}
        ${confirmationUrl ? `<p style="margin:22px 0 10px">${buttonLink(confirmationUrl, 'Confirm email')}</p>` : ''}
        ${confirmationUrl ? `<p style="margin:0;color:#64748b;font-size:13px">Prefer clicking a link? Use the button above.</p>` : ''}
        <p style="color:#8a8577;font-size:13px">If you did not create this account, ignore this email.</p>`,
    };
  }

  if (action === 'magiclink') {
    return {
      subject: 'Your TradingBible sign-in code',
      title: 'Sign in to TradingBible',
      body: `
        <p>Use this one-time code to finish signing in. It expires shortly and can only be used once.</p>
        ${token ? `<p style="margin:18px 0 8px;font-weight:600">Your 6-digit sign-in code:</p>${tokenBlock(token)}` : ''}
        ${confirmationUrl ? `<p style="margin:22px 0 10px">${buttonLink(confirmationUrl, 'Sign in with link')}</p>` : ''}
        ${confirmationUrl ? `<p style="margin:0;color:#64748b;font-size:13px">You can either paste the code in the app or tap the sign-in link.</p>` : ''}
        <p style="color:#8a8577;font-size:13px">If you did not request this code, ignore this email.</p>`,
    };
  }

  if (action === 'recovery') {
    return {
      subject: 'Reset your TradingBible password',
      title: 'Reset your password',
      body: `
        <p>We received a request to reset your password. This link is valid for a short time.</p>
        ${confirmationUrl ? `<p style="margin:22px 0 10px">${buttonLink(confirmationUrl, 'Reset password')}</p>` : ''}
        <p style="color:#8a8577;font-size:13px">If you did not request this, ignore this email.</p>`,
    };
  }

  if (action === 'invite') {
    return {
      subject: 'You are invited to TradingBible',
      title: 'You are invited',
      body: `
        <p>You have been invited to join TradingBible.</p>
        ${confirmationUrl ? `<p style="margin:22px 0 10px">${buttonLink(confirmationUrl, 'Accept invitation')}</p>` : ''}
      `,
    };
  }

  return {
    subject: 'TradingBible verification',
    title: 'TradingBible verification',
    body: `
      <p>Please use the code below or tap the link to continue.</p>
      ${token ? tokenBlock(token) : ''}
      ${confirmationUrl ? `<p style="margin:22px 0 10px">${buttonLink(confirmationUrl, 'Continue')}</p>` : ''}
    `,
  };
}

export async function authSendEmailHandler(req, res, next) {
  try {
    if (!transporter) {
      console.warn('SMTP not configured, skipping email send');
      return res.status(200).json({});
    }

    const payload = req.rawBody?.length ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
    const headers = req.headers;

    let parsed;
    if (webhook) {
      try {
        parsed = webhook.verify(payload, headers);
      } catch (err) {
        if (err instanceof WebhookVerificationError) {
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
        throw err;
      }
    } else {
      parsed = JSON.parse(payload);
    }

    const { user, email_data: emailData } = parsed;
    const mail = getMailCopy(emailData);
    const to = String(user?.email || '').trim();

    if (!to) {
      return res.status(400).json({ error: 'Recipient email is missing' });
    }

    const textBody = `TradingBible ${mail.subject}\n\n${String(emailData?.token || '')}\n${String(emailData?.confirmation_url || emailData?.confirmationURL || '')}`.trim();
    const htmlBody = brandShell({ title: mail.title, body: mail.body });
    // Hostinger requires envelope-from == SMTP user exactly, otherwise 553.
    // First try display-name From, then fall back to bare address.
    try {
      await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpFromEmail}>`,
        envelope: { from: smtpUser, to },
        to,
        subject: mail.subject,
        text: textBody,
        html: htmlBody,
      });
    } catch (firstErr) {
      const msg = String(firstErr?.message || '');
      console.error('SMTP send attempt 1 failed:', msg, 'to', to);
      if (/553|sender|owned|rejected/i.test(msg)) {
        try {
          await transporter.sendMail({
            from: smtpFromEmail,
            envelope: { from: smtpUser, to },
            to,
            subject: mail.subject,
            text: textBody,
            html: htmlBody,
          });
        } catch (secondErr) {
          console.error('SMTP send attempt 2 failed:', String(secondErr?.message || secondErr), 'to', to, 'token', String(emailData?.token || '').slice(0, 2) + '****');
        }
      } else {
        console.error('SMTP send failed:', msg, 'to', to);
      }
      // Always return 200 so Supabase OTP is still created — user can resend,
      // use OAuth, or contact support. Never block login with a 500.
    }

    return res.status(200).json({});
  } catch (error) {
    return next(error);
  }
}

export default authSendEmailHandler;
