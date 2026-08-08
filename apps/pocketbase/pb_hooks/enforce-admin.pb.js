/// <reference path="../pb_data/types.d.ts" />

// The sole admin account. Any user created with this email is promoted to the
// "admin" role; everyone else is forced to "user".
const ADMIN_EMAIL = "malibaequityholdingsltd@outlook.com";

onRecordCreateRequest((e) => {
  try {
    const email = String(e.record.get("email") || "").toLowerCase();
    e.record.set("role", email === ADMIN_EMAIL ? "admin" : "user");
  } catch (_) {}
  e.next();
}, "users");

onRecordUpdateRequest((e) => {
  // Prevent regular users from self-promoting to admin.
  try {
    const email = String(e.record.get("email") || "").toLowerCase();
    if (email !== ADMIN_EMAIL && e.record.get("role") === "admin") {
      e.record.set("role", "user");
    }
    if (email === ADMIN_EMAIL) {
      e.record.set("role", "admin");
    }
  } catch (_) {}
  e.next();
}, "users");
