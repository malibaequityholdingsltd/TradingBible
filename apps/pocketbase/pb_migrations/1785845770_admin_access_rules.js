/// <reference path="../pb_data/types.d.ts" />

// Grant admin-role users full read/write access to all users and
// read access to trades, price_alerts, trading_signals, broker_accounts,
// kyc_submissions so the admin portal can display real platform data.

migrate(
  (app) => {
    // --- users collection: let admins list/view/update/delete any user ---
    const users = app.findCollectionByNameOrId("users");
    users.listRule   = "id = @request.auth.id || @request.auth.role = 'admin'";
    users.viewRule   = "id = @request.auth.id || @request.auth.role = 'admin'";
    users.updateRule = "id = @request.auth.id || @request.auth.role = 'admin'";
    users.deleteRule = "id = @request.auth.id || @request.auth.role = 'admin'";
    app.save(users);

    // --- trades: admins can view all for analytics ---
    const trades = app.findCollectionByNameOrId("trades");
    trades.listRule = "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')";
    trades.viewRule = "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')";
    app.save(trades);

    // --- price_alerts: admins can view all ---
    const alerts = app.findCollectionByNameOrId("price_alerts");
    alerts.listRule = "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')";
    alerts.viewRule = "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')";
    app.save(alerts);

    // --- trading_signals: admins can view all ---
    const signals = app.findCollectionByNameOrId("trading_signals");
    signals.listRule = "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')";
    signals.viewRule = "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')";
    app.save(signals);

    // --- broker_accounts: admins can view all ---
    const brokers = app.findCollectionByNameOrId("broker_accounts");
    brokers.listRule = "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')";
    brokers.viewRule = "@request.auth.id != '' && (@request.auth.id = owner || @request.auth.role = 'admin')";
    app.save(brokers);

    // --- kyc_submissions already has admin rule, leave as-is ---

    // --- forum_threads: already public list/view ---
    // --- forum_replies: already public list/view ---
  },
  (app) => {
    // Revert users rules
    const users = app.findCollectionByNameOrId("users");
    users.listRule   = "id = @request.auth.id";
    users.viewRule   = "id = @request.auth.id";
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";
    app.save(users);

    const trades = app.findCollectionByNameOrId("trades");
    trades.listRule = "@request.auth.id != '' && @request.auth.id = owner";
    trades.viewRule = "@request.auth.id != '' && @request.auth.id = owner";
    app.save(trades);

    const alerts = app.findCollectionByNameOrId("price_alerts");
    alerts.listRule = "@request.auth.id != '' && @request.auth.id = owner";
    alerts.viewRule = "@request.auth.id != '' && @request.auth.id = owner";
    app.save(alerts);

    const signals = app.findCollectionByNameOrId("trading_signals");
    signals.listRule = "@request.auth.id != '' && @request.auth.id = owner";
    signals.viewRule = "@request.auth.id != '' && @request.auth.id = owner";
    app.save(signals);

    const brokers = app.findCollectionByNameOrId("broker_accounts");
    brokers.listRule = "@request.auth.id != '' && @request.auth.id = owner";
    brokers.viewRule = "@request.auth.id != '' && @request.auth.id = owner";
    app.save(brokers);
  }
);
