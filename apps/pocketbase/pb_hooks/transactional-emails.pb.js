/// <reference path="../pb_data/types.d.ts" />

// TradingBible transactional email templates.
// Hook callbacks run in isolated JSVM scopes, so every helper/constant MUST be
// defined INSIDE the callback that uses it — file-level bindings are undefined
// at call time (that is what previously threw "shell is not defined").

// --- Branded password reset email ---
onMailerRecordPasswordResetSend((e) => {
  const shell = (title, bodyHtml) => `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <div style="background:#0a0a0f;padding:22px 24px;border-radius:12px 12px 0 0">
        <span style="color:#f4e6a8;font-size:20px;font-weight:700">Trading<span style="color:#a67c1e">Bible</span></span>
      </div>
      <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:26px 24px">
        <h1 style="color:#a67c1e;font-size:20px;margin:0 0 14px">${title}</h1>
        ${bodyHtml}
        <p style="color:#8a8577;font-size:12px;margin-top:26px">TradingBible by MALIBA EQUITY HOLDINGS LTD · Trade like the 1%. Journal like a fund.</p>
      </div>
    </div>`;
  const appUrl = $app.settings().meta.appUrl;
  const link = `${appUrl}/_/#/auth/confirm-password-reset/${e.meta.token}`;
  e.message.from.name = "TradingBible";
  e.message.subject = "Reset your TradingBible password";
  e.message.html = shell("Reset your password", `
    <p>We received a request to reset your password. This link is valid for 30 minutes.</p>
    <p style="margin:22px 0"><a href="${link}" style="background:linear-gradient(120deg,#f4e6a8,#c99a25);color:#0a0a0f;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:600">Reset password</a></p>
    <p style="color:#8a8577;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`);
  e.next();
}, "users");

// --- Branded 2FA / login OTP code email ---
onMailerRecordOTPSend((e) => {
  const shell = (title, bodyHtml) => `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <div style="background:#0a0a0f;padding:22px 24px;border-radius:12px 12px 0 0">
        <span style="color:#f4e6a8;font-size:20px;font-weight:700">Trading<span style="color:#a67c1e">Bible</span></span>
      </div>
      <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:26px 24px">
        <h1 style="color:#a67c1e;font-size:20px;margin:0 0 14px">${title}</h1>
        ${bodyHtml}
        <p style="color:#8a8577;font-size:12px;margin-top:26px">TradingBible by MALIBA EQUITY HOLDINGS LTD · Trade like the 1%. Journal like a fund.</p>
      </div>
    </div>`;
  e.message.from.name = "TradingBible";
  e.message.subject = "Your TradingBible verification code";
  e.message.html = shell("Two-factor verification", `
    <p>Use this one-time code to finish signing in. It expires in 5 minutes.</p>
    <div style="font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;letter-spacing:6px;color:#a67c1e;background:#faf6e8;border-radius:10px;padding:16px;text-align:center;margin:20px 0">${e.meta.password}</div>
    <p style="color:#8a8577;font-size:13px">Never share this code with anyone.</p>`);
  e.next();
}, "users");

// --- Email verification link ---
onMailerRecordVerificationSend((e) => {
  const shell = (title, bodyHtml) => `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <div style="background:#0a0a0f;padding:22px 24px;border-radius:12px 12px 0 0">
        <span style="color:#f4e6a8;font-size:20px;font-weight:700">Trading<span style="color:#a67c1e">Bible</span></span>
      </div>
      <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:26px 24px">
        <h1 style="color:#a67c1e;font-size:20px;margin:0 0 14px">${title}</h1>
        ${bodyHtml}
        <p style="color:#8a8577;font-size:12px;margin-top:26px">TradingBible by MALIBA EQUITY HOLDINGS LTD · Trade like the 1%. Journal like a fund.</p>
      </div>
    </div>`;
  const appUrl = $app.settings().meta.appUrl;
  const link = `${appUrl}/_/#/auth/confirm-verification/${e.meta.token}`;
  e.message.from.name = "TradingBible";
  e.message.subject = "Verify your TradingBible email";
  e.message.html = shell("Confirm your email address", `
    <p>Confirm your email to unlock full access to your TradingBible terminal.</p>
    <p style="margin:22px 0"><a href="${link}" style="background:linear-gradient(120deg,#f4e6a8,#c99a25);color:#0a0a0f;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:600">Verify email</a></p>
    <p style="color:#8a8577;font-size:13px">If you didn't create an account, you can ignore this email.</p>`);
  e.next();
}, "users");

// --- Payment / plan confirmation on plan change ---
onRecordAfterUpdateSuccess((e) => {
  const shell = (title, bodyHtml) => `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <div style="background:#0a0a0f;padding:22px 24px;border-radius:12px 12px 0 0">
        <span style="color:#f4e6a8;font-size:20px;font-weight:700">Trading<span style="color:#a67c1e">Bible</span></span>
      </div>
      <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:26px 24px">
        <h1 style="color:#a67c1e;font-size:20px;margin:0 0 14px">${title}</h1>
        ${bodyHtml}
        <p style="color:#8a8577;font-size:12px;margin-top:26px">TradingBible by MALIBA EQUITY HOLDINGS LTD · Trade like the 1%. Journal like a fund.</p>
      </div>
    </div>`;
  const newPlan = e.record.get("plan");
  const oldPlan = e.record.original() ? e.record.original().get("plan") : null;
  if (newPlan && newPlan !== oldPlan && newPlan !== "trial") {
    const label = newPlan.charAt(0).toUpperCase() + newPlan.slice(1);
    const to = e.record.get("email");
    if (to) {
      try {
        $app.newMailClient().send(new MailerMessage({
          from: { name: "TradingBible" },
          to: [{ address: to }],
          subject: `Payment confirmed — TradingBible ${label}`,
          html: shell("Payment confirmed", `
            <p>Thank you — your upgrade to the <strong>${label}</strong> plan is now active.</p>
            <p>Your premium analytics, AI coaching and reporting features are unlocked immediately.</p>
            <p style="margin:22px 0"><a href="${$app.settings().meta.appUrl}/app" style="background:linear-gradient(120deg,#f4e6a8,#c99a25);color:#0a0a0f;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:600">Open your terminal</a></p>`),
        }));
      } catch (err) {
        $app.logger().error("payment email failed", "err", String(err));
      }
    }
  }
  e.next();
}, "users");

// --- Trade alert email when a new trade is synced ---
onRecordAfterCreateSuccess((e) => {
  const shell = (title, bodyHtml) => `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <div style="background:#0a0a0f;padding:22px 24px;border-radius:12px 12px 0 0">
        <span style="color:#f4e6a8;font-size:20px;font-weight:700">Trading<span style="color:#a67c1e">Bible</span></span>
      </div>
      <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:26px 24px">
        <h1 style="color:#a67c1e;font-size:20px;margin:0 0 14px">${title}</h1>
        ${bodyHtml}
        <p style="color:#8a8577;font-size:12px;margin-top:26px">TradingBible by MALIBA EQUITY HOLDINGS LTD · Trade like the 1%. Journal like a fund.</p>
      </div>
    </div>`;
  try {
    const owner = $app.findRecordById("users", e.record.get("owner"));
    const to = owner.get("email");
    if (!to) { e.next(); return; }
    const pnl = e.record.get("pnl") || 0;
    const sym = e.record.get("symbol");
    const dir = e.record.get("direction") || "";
    const pnlColor = pnl >= 0 ? "#16794c" : "#b23b3b";
    const pnlText = `${pnl >= 0 ? "+" : ""}$${Number(pnl).toLocaleString()}`;
    $app.newMailClient().send(new MailerMessage({
      from: { name: "TradingBible" },
      to: [{ address: to }],
      subject: `Trade synced: ${sym} ${pnlText}`,
      html: shell("New trade in your journal", `
        <p>A new trade was just synced to your TradingBible journal:</p>
        <table style="width:100%;border-collapse:collapse;margin:14px 0">
          <tr><td style="padding:6px 0;color:#8a8577">Symbol</td><td style="text-align:right;font-weight:600">${sym} ${dir}</td></tr>
          <tr><td style="padding:6px 0;color:#8a8577">Strategy</td><td style="text-align:right">${e.record.get("strategy") || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#8a8577">Result</td><td style="text-align:right;font-weight:700;color:${pnlColor}">${pnlText}</td></tr>
        </table>
        <p style="color:#8a8577;font-size:13px">Your dashboard and AI reports have been updated automatically.</p>`),
    }));
  } catch (err) {
    $app.logger().error("trade alert email failed", "err", String(err));
  }
  e.next();
}, "trades");
