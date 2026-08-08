/// <reference path="../pb_data/types.d.ts" />

// When an admin logs a "message" or "request_info" action against a KYC
// submission (with notifyUser=true), email the applicant. Approvals and
// rejections are already emailed by kyc-verification.pb.js on the status change.
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
    const action = e.record.get("action");
    if (action !== "message" && action !== "request_info") { e.next(); return; }
    if (!e.record.getBool("notifyUser")) { e.next(); return; }
    const targetId = e.record.get("targetUser");
    if (!targetId) { e.next(); return; }
    const target = $app.findRecordById("users", targetId);
    const to = target.get("email");
    if (!to) { e.next(); return; }
    const msg = e.record.get("message") || "";
    const appUrl = $app.settings().meta.appUrl;
    const title = action === "request_info"
      ? "Additional information needed"
      : "A message from the TradingBible verification team";
    const intro = action === "request_info"
      ? "<p>To finish verifying your account, our compliance team needs a little more from you:</p>"
      : "<p>Our verification team has sent you a message:</p>";
    $app.newMailClient().send(new MailerMessage({
      from: { name: "TradingBible Verification" },
      to: [{ address: to }],
      subject: action === "request_info" ? "Action needed: TradingBible verification" : "Message from TradingBible verification",
      html: shell(title, `
        ${intro}
        <p style="background:#faf6e8;border-radius:10px;padding:12px 14px;color:#7a6a2e">${msg}</p>
        <p style="margin:22px 0"><a href="${appUrl}/app/verify" style="background:linear-gradient(120deg,#f4e6a8,#c99a25);color:#0a0a0f;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:600">Go to verification</a></p>`),
    }));
  } catch (err) {
    $app.logger().error("kyc admin message email failed", "err", String(err));
  }
  e.next();
}, "kyc_audit_logs");
