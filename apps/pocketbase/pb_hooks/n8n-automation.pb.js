/// <reference path="../pb_data/types.d.ts" />

// TradingBible automation layer.
// Every meaningful event is forwarded to n8n (N8N_WEBHOOK_URL) as a typed
// workflow event, so the following workflows can run downstream:
//   - user.signup            -> create profile, start trial, welcome notification
//   - trade.created          -> save trade, send to AI, generate analysis, update stats
//   - subscription.changed   -> Paddle success unlocks premium / cancel downgrades
// Daily and weekly report triggers are scheduled inside n8n itself (cron nodes)
// and call back into the app; this hook covers the record-driven events.

// 1. New user signup workflow: start trial, notify, welcome email.
onRecordAfterCreateSuccess((e) => {
  // Hook callbacks run in isolated JSVM scopes; define helpers inside.
  const fireWorkflow = (event, payload) => {
    const url = $os.getenv("N8N_WEBHOOK_URL");
    if (!url) {
      $app.logger().info("n8n webhook skipped (N8N_WEBHOOK_URL unset)", "event", event);
      return;
    }
    try {
      $http.send({
        url: url,
        method: "POST",
        timeout: 8,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: event, sentAt: new Date().toISOString(), data: payload }),
      });
    } catch (err) {
      $app.logger().error("n8n webhook failed", "event", event, "err", String(err));
    }
  };

  const email = e.record.get("email");

  fireWorkflow("user.signup", {
    userId: e.record.id,
    email: email,
    username: e.record.get("username"),
    plan: e.record.get("plan") || "trial",
    createdAt: e.record.get("created"),
  });

  const message = new MailerMessage({
    from: { name: "TradingBible" },
    to: [{ address: email }],
    subject: "Welcome to TradingBible — your 7-day premium trial is live",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;color:#1a1a1a">
        <h1 style="color:#a67c1e">Welcome to TradingBible</h1>
        <p>Your 7-day premium trial is now active. Here's how to get the most from it:</p>
        <ul>
          <li>Connect a broker to auto-sync your full trade history</li>
          <li>Open the dashboard for your live analytics and Trader Score</li>
          <li>Ask the AI Coach to review your last trades</li>
        </ul>
        <p>Trade like the 1%. Journal like a fund.</p>
        <p style="color:#8a8577;font-size:12px">TradingBible · This is an automated message.</p>
      </div>`,
  });
  try {
    $app.newMailClient().send(message);
  } catch (err) {
    $app.logger().error("welcome email failed", "to", email, "err", String(err));
  }

  e.next();
}, "users");

// 2. New trade workflow: forward for AI analysis + stat recompute.
onRecordAfterCreateSuccess((e) => {
  const fireWorkflow = (event, payload) => {
    const url = $os.getenv("N8N_WEBHOOK_URL");
    if (!url) {
      $app.logger().info("n8n webhook skipped (N8N_WEBHOOK_URL unset)", "event", event);
      return;
    }
    try {
      $http.send({
        url: url,
        method: "POST",
        timeout: 8,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: event, sentAt: new Date().toISOString(), data: payload }),
      });
    } catch (err) {
      $app.logger().error("n8n webhook failed", "event", event, "err", String(err));
    }
  };

  fireWorkflow("trade.created", {
    tradeId: e.record.id,
    owner: e.record.get("owner"),
    symbol: e.record.get("symbol"),
    market: e.record.get("market"),
    direction: e.record.get("direction"),
    entry: e.record.get("entry"),
    exit: e.record.get("exit"),
    pnl: e.record.get("pnl"),
    strategy: e.record.get("strategy"),
    emotion: e.record.get("emotion"),
    source: e.record.get("source"),
    tradeDate: e.record.get("tradeDate"),
  });
  e.next();
}, "trades");

// 3. Subscription events: plan change fires unlock/downgrade workflow.
onRecordAfterUpdateSuccess((e) => {
  const fireWorkflow = (event, payload) => {
    const url = $os.getenv("N8N_WEBHOOK_URL");
    if (!url) {
      $app.logger().info("n8n webhook skipped (N8N_WEBHOOK_URL unset)", "event", event);
      return;
    }
    try {
      $http.send({
        url: url,
        method: "POST",
        timeout: 8,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: event, sentAt: new Date().toISOString(), data: payload }),
      });
    } catch (err) {
      $app.logger().error("n8n webhook failed", "event", event, "err", String(err));
    }
  };

  const newPlan = e.record.get("plan");
  const oldPlan = e.record.original() ? e.record.original().get("plan") : null;
  if (newPlan !== oldPlan) {
    fireWorkflow("subscription.changed", {
      userId: e.record.id,
      email: e.record.get("email"),
      from: oldPlan,
      to: newPlan,
      premium: newPlan && newPlan !== "trial",
    });
  }
  e.next();
}, "users");
