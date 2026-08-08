/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');

    const ownerField = () => ({
      name: 'owner', type: 'relation', required: true, maxSelect: 1,
      collectionId: users.id, cascadeDelete: true,
    });
    const created = { name: 'created', type: 'autodate', onCreate: true, onUpdate: false };
    const updated = { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true };
    const ownerRules = {
      listRule: "@request.auth.id != '' && @request.auth.id = owner",
      viewRule: "@request.auth.id != '' && @request.auth.id = owner",
      createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
      updateRule: "@request.auth.id != '' && @request.auth.id = owner",
      deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
    };

    // Crypto bank account (one per user)
    try { app.findCollectionByNameOrId('crypto_accounts'); } catch (_) {
      app.save(new Collection({
        type: 'base', name: 'crypto_accounts', ...ownerRules,
        fields: [
          { name: 'balance', type: 'number' },
          { name: 'reserved', type: 'number' },
          { name: 'currency', type: 'text', max: 10 },
          { name: 'holdings', type: 'json', maxSize: 200000 },
          ownerField(), created, updated,
        ],
        indexes: ['CREATE INDEX idx_crypto_accounts_owner ON crypto_accounts (owner)'],
      }));
    }

    // Bank cards (debit / credit, virtual / physical)
    try { app.findCollectionByNameOrId('bank_cards'); } catch (_) {
      app.save(new Collection({
        type: 'base', name: 'bank_cards', ...ownerRules,
        fields: [
          { name: 'cardKind', type: 'select', maxSelect: 1, values: ['debit', 'credit'] },
          { name: 'form', type: 'select', maxSelect: 1, values: ['virtual', 'physical'] },
          { name: 'label', type: 'text', max: 60 },
          { name: 'last4', type: 'text', max: 4 },
          { name: 'expiry', type: 'text', max: 8 },
          { name: 'network', type: 'text', max: 20 },
          { name: 'status', type: 'select', maxSelect: 1, values: ['active', 'frozen'] },
          { name: 'spendingLimit', type: 'number' },
          { name: 'creditLimit', type: 'number' },
          { name: 'creditUsed', type: 'number' },
          ownerField(), created, updated,
        ],
        indexes: ['CREATE INDEX idx_bank_cards_owner ON bank_cards (owner)'],
      }));
    }

    // Transactions
    try { app.findCollectionByNameOrId('bank_transactions'); } catch (_) {
      app.save(new Collection({
        type: 'base', name: 'bank_transactions', ...ownerRules,
        fields: [
          { name: 'kind', type: 'select', maxSelect: 1, values: ['deposit', 'withdrawal', 'transfer', 'buy', 'sell', 'card_purchase'] },
          { name: 'asset', type: 'text', max: 20 },
          { name: 'amount', type: 'number' },
          { name: 'fiatValue', type: 'number' },
          { name: 'status', type: 'select', maxSelect: 1, values: ['pending', 'completed', 'failed'] },
          { name: 'counterparty', type: 'text', max: 120 },
          { name: 'note', type: 'text', max: 300 },
          ownerField(), created,
        ],
        indexes: ['CREATE INDEX idx_bank_tx_owner ON bank_transactions (owner)'],
      }));
    }

    // Academy waitlist (public create so anyone can join)
    try { app.findCollectionByNameOrId('academy_waitlist'); } catch (_) {
      app.save(new Collection({
        type: 'base', name: 'academy_waitlist',
        listRule: null, viewRule: null,
        createRule: '', updateRule: null, deleteRule: null,
        fields: [
          { name: 'name', type: 'text', max: 80 },
          { name: 'email', type: 'email', required: true },
          { name: 'interest', type: 'select', maxSelect: 1, values: ['Beginner', 'Intermediate', 'Professional'] },
          created,
        ],
      }));
    }

    // Passwordless: enable OTP for users
    users.otp.enabled = true;
    users.otp.duration = 600; // 10 minutes
    users.otp.length = 6;
    app.save(users);
  },
  (app) => {
    ['crypto_accounts', 'bank_cards', 'bank_transactions', 'academy_waitlist'].forEach((n) => {
      try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) { /* skip */ }
    });
  },
);
