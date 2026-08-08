/// <reference path="../pb_data/types.d.ts" />

// Force every new KYC/KYB submission to start as "pending" — a user must never
// be able to self-approve by posting status=approved.
onRecordCreateRequest((e) => {
  e.record.set("status", "pending");
  e.record.set("reviewNote", "");
  e.next();
}, "kyc_submissions");

// Only an admin may change a submission's review status. Block any attempt by
// a regular owner to self-approve (they resubmit via a fresh create instead).
onRecordUpdateRequest((e) => {
  const auth = e.requestInfo && e.requestInfo.auth;
  const isAdmin = !!auth && auth.get("role") === "admin";
  if (!isAdmin) {
    const original = e.record.original();
    e.record.set("status", original ? original.get("status") : "pending");
    e.record.set("reviewNote", original ? original.get("reviewNote") : "");
  }
  e.next();
}, "kyc_submissions");

// Email the applicant when an admin approves or rejects their verification.
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
  try {
    const status = e.record.get("status");
    const prev = e.record.original() ? e.record.original().get("status") : null;
    if (status === prev || (status !== "approved" && status !== "rejected")) { e.next(); return; }
    const owner = $app.findRecordById("users", e.record.get("owner"));
    const to = owner.get("email");
    if (!to) { e.next(); return; }
    const appUrl = $app.settings().meta.appUrl;
    if (status === "approved") {
      $app.newMailClient().send(new MailerMessage({
        from: { name: "TradingBible" },
        to: [{ address: to }],
        subject: "Your TradingBible verification is approved",
        html: shell("Verification approved", `
          <p>Great news — your identity verification has been <strong>approved</strong>. Your TradingBible terminal is now fully unlocked.</p>
          <p style="margin:22px 0"><a href="${appUrl}/app" style="background:linear-gradient(120deg,#f4e6a8,#c99a25);color:#0a0a0f;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:600">Open your terminal</a></p>`),
      }));
    } else {
      const note = e.record.get("reviewNote") || "Some details could not be verified.";
      $app.newMailClient().send(new MailerMessage({
        from: { name: "TradingBible" },
        to: [{ address: to }],
        subject: "Action needed: TradingBible verification",
        html: shell("Verification needs attention", `
          <p>Unfortunately we couldn't approve your verification.</p>
          <p style="background:#faf6e8;border-radius:10px;padding:12px 14px;color:#7a6a2e">${note}</p>
          <p>Please resubmit your details from your account, or contact support for help.</p>`),
      }));
    }
  } catch (err) {
    $app.logger().error("kyc status email failed", "err", String(err));
  }
  e.next();
}, "kyc_submissions");
