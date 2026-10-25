#!/usr/bin/env node
// Verify the configured SMTP mailbox and send one plain/text delivery test.
// Usage: npm run smtp:test -- recipient@example.com
// Reads credentials from apps/api/.env; never prints the password.
import { createTransport } from 'nodemailer';
import { brandShell, infoBox } from '../src/utils/email-brand.js';

const to = process.argv[2] || process.env.SMTP_USER;
if (!to) {
  console.error('Usage: npm run smtp:test -- recipient@example.com');
  process.exit(1);
}

const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER;
const from = process.env.SMTP_FROM_EMAIL || user;
const name = process.env.SMTP_FROM_NAME || 'TradingBible';

if (!process.env.SMTP_HOST || !user || !process.env.SMTP_PASS) {
  console.error('SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.');
  process.exit(1);
}

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  requireTLS: port === 587,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  auth: { user, pass: process.env.SMTP_PASS },
});

try {
  await transporter.verify();
  const info = await transporter.sendMail({
    from: { name, address: from },
    to,
    replyTo: from,
    subject: 'TradingBible mail delivery test',
    text: [
      'This is a delivery test from TradingBible.',
      '',
      `Mailbox: ${user}`,
      `Sender: ${name} <${from}>`,
      `Sent: ${new Date().toISOString()}`,
      '',
      'If this message is in your inbox, the support mailbox is sending correctly.',
      'If it arrived in spam, add SPF, DKIM and DMARC records for tradingbible.app before production.',
    ].join('\n'),
    html: brandShell({
      eyebrow: 'Mail delivery test',
      title: 'The support mailbox is connected.',
      headerTag: 'SMTP',
      body: `<p style="color:#b8b2a2;font-size:14px;line-height:1.7;margin:0 0 14px">This is a delivery test from TradingBible. If it is in your inbox, <strong style="color:#f0ecdd">${from}</strong> is authenticated and sending normally.</p>${infoBox('<p style="color:#b8b2a2;font-size:13px;line-height:1.7;margin:0">If this message arrived in spam, add SPF, DKIM and DMARC records for <strong style="color:#f0ecdd">tradingbible.app</strong> before production.</p>')}`,
    }),
  });
  console.log(JSON.stringify({
    ok: true,
    host: process.env.SMTP_HOST,
    port,
    mailbox: user,
    from,
    to,
    accepted: info.accepted,
    rejected: info.rejected,
    messageId: info.messageId,
    response: info.response,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    code: error.code,
    responseCode: error.responseCode,
    command: error.command,
    message: String(error.message || error),
  }, null, 2));
  process.exitCode = 1;
} finally {
  transporter.close();
}
