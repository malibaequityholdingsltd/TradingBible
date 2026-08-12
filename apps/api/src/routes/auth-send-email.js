import { createTransport } from 'nodemailer';
import { Webhook, WebhookVerificationError } from 'standardwebhooks';

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
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null;

const webhook = hookSecret ? new Webhook(hookSecret.replace(/^v1,whsec_/, '')) : null;

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function brandShell(title, body) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;background:#f8fafc;padding:18px">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.12)">
        <div style="background:linear-gradient(120deg,#0a0a0f,#14161c);padding:22px 24px">
          <span style="color:#f4e6a8;font-size:20px;font-weight:700">Trading<span style="color:#d4af37">Bible</span></span>
        </div>
        <div style="padding:26px 24px">
          <h1 style="color:#c99a25;font-size:20px;margin:0 0 14px">${escapeHtml(title)}</h1>
          ${body}
          <p style="color:#64748b;font-size:12px;margin-top:26px">TradingBible LLC · Trade like the 1%. Journal like a fund.</p>
        </div>
      </div>
    </div>`;
}

function tokenBlock(token) {
  return `
    <div style="font-family:'JetBrains Mono',monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:#0a0a0f;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;text-align:center;margin:20px 0">${escapeHtml(token)}</div>`;
}

function buttonLink(url, label) {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:linear-gradient(120deg,#f4e6a8,#c99a25);color:#0a0a0f;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700">${escapeHtml(label)}</a>`;
}

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
      throw new Error('SMTP is not configured.');
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

    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to,
      subject: mail.subject,
      text: `TradingBible ${mail.subject}\n\n${String(emailData?.token || '')}\n${String(emailData?.confirmation_url || emailData?.confirmationURL || '')}`.trim(),
      html: brandShell(mail.title, mail.body),
    });

    return res.status(200).json({});
  } catch (error) {
    return next(error);
  }
}

export default authSendEmailHandler;
