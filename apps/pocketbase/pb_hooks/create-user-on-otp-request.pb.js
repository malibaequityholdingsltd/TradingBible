/// <reference path="../pb_data/types.d.ts" />

onRecordRequestOTPRequest((e) => {
  // Passwordless signup: create the user record if it doesn't exist yet
  // so first-time visitors can sign in with an email code.
  if (!e.record) {
    const email = e.requestInfo().body['email'];
    if (email) {
      const record = new Record(e.collection);
      record.setEmail(email);
      record.setPassword($security.randomString(30));
      record.set('username', String(email).split('@')[0]);
      record.set('name', String(email).split('@')[0]);
      record.set('plan', 'trial');
      e.app.save(record);
      e.record = record;
    }
  }
  return e.next();
}, 'users');
