import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const ADMIN_EMAILS = ['malibaequityholdingsltd@outlook.com', 'tradingbible@hotmail.com'];

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isAdminEmail(value) {
  return ADMIN_EMAILS.includes(normalizeEmail(value));
}

function parseFilterValue(raw) {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function applyFilter(query, filter) {
  if (!filter || typeof filter !== 'string') return query;
  const clauses = filter.split(/\s*(?:&&|\band\b)\s*/i).map((c) => c.trim()).filter(Boolean);
  let next = query;
  for (const clause of clauses) {
    const match = clause.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
    if (!match) continue;
    const [, field, rawValue] = match;
    next = next.eq(field, parseFilterValue(rawValue));
  }
  return next;
}

function applySort(query, sort) {
  if (!sort || typeof sort !== 'string') return query;
  let next = query;
  const fields = sort.split(',').map((f) => f.trim()).filter(Boolean);
  for (const fieldSpec of fields) {
    const desc = fieldSpec.startsWith('-');
    const column = desc ? fieldSpec.slice(1) : fieldSpec;
    if (!column) continue;
    next = next.order(column, { ascending: !desc });
  }
  return next;
}

function isMissingColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

function isSchemaCacheColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && (message.includes('schema cache') || message.includes('could not find'));
}

function isMissingRelationError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('relation') && message.includes('does not exist');
}

function buildSortVariants(sort) {
  if (!sort || typeof sort !== 'string') return [sort];
  const variants = [sort];
  const replacements = [
    [/\bcreated\b/g, 'created_at'],
    [/\bupdated\b/g, 'updated_at'],
    [/\bsubmittedAt\b/g, 'submitted_at'],
    [/\btrialEndsAt\b/g, 'trial_ends_at'],
  ];
  let alt = sort;
  for (const [pattern, next] of replacements) alt = alt.replace(pattern, next);
  if (alt !== sort) variants.push(alt);
  return variants;
}

function createSupabaseCompatClient() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  // Supabase JS has no built-in request timeout: a stalled network call
  // would hang forever (e.g. login stuck on "Please wait…"). Every auth
  // request races a timeout so the UI always settles with a clear error.
  const withTimeout = (promise, ms, label) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s — check your connection and try again.`)),
      ms,
    )),
  ]);

  let resolveAuthReady;
  const authReady = new Promise((resolve) => {
    resolveAuthReady = resolve;
  });
  let authReadyResolved = false;
  const markAuthReady = () => {
    if (!authReadyResolved) {
      authReadyResolved = true;
      resolveAuthReady();
    }
  };

  const listeners = new Set();
  const authStore = {
    token: null,
    record: null,
    isValid: false,
    ready: authReady,
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    clear() {
      try {
        const id = authStore.record?.id;
        if (id) localStorage.removeItem(`tb:profile-v1:${id}`);
      } catch { /* ignore */ }
      supabase.auth.signOut();
    },
  };

  let lastAuthSignature = null;
  const notifyAuth = () => {
    // Supabase fires both getSession() and the initial onAuthStateChange
    // event on boot. They often resolve to the same profile; don't wake every
    // auth subscriber (and refetch notifications) twice for identical data.
    const signature = `${authStore.token || ''}|${authStore.isValid ? 1 : 0}|${JSON.stringify(authStore.record || null)}`;
    if (signature === lastAuthSignature) return;
    lastAuthSignature = signature;
    listeners.forEach((cb) => cb(authStore.token, authStore.record));
  };

  // Legacy account types (pre-Teacher model) map forward automatically.
  const LEGACY_TYPES = { individual: 'trader', company: 'teacher' };
  function normalizeProfile(profile, source = 'users') {
    if (!profile) return null;
    const rawType = profile.accountType || profile.account_type || 'trader';
    return {
      ...profile,
      profileSource: source,
      role: profile.role || profile.user_role || 'user',
      accountType: LEGACY_TYPES[rawType] || rawType,
      created: profile.created || profile.created_at || null,
      trialEndsAt: profile.trialEndsAt || profile.trial_ends_at || null,
    };
  }

  async function loadProfile(userId) {
    const usersRes = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (!usersRes.error && usersRes.data) return normalizeProfile(usersRes.data, 'users');
    const profilesRes = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (profilesRes.error || !profilesRes.data) return null;
    return normalizeProfile(profilesRes.data, 'profiles');
  }

  async function loadProfileByEmail(email) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) return null;

    const usersRes = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
    if (!usersRes.error && usersRes.data) return normalizeProfile(usersRes.data, 'users');

    const profilesRes = await supabase.from('profiles').select('*').eq('email', cleanEmail).maybeSingle();
    if (profilesRes.error || !profilesRes.data) return null;
    return normalizeProfile(profilesRes.data, 'profiles');
  }

  function mapRecord(user, profile) {
    if (!user) return null;
    const normalized = normalizeProfile(profile, profile?.profileSource || 'users');
    const admin = isAdminEmail(user.email);
    // OAuth providers ship full_name instead of first/last — split it as a
    // last-resort fallback so social signups still get a real name.
    const metaName = String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim();
    const [metaFirst, ...metaRest] = metaName.split(/\s+/).filter(Boolean);
    const settings = (normalized?.user_settings && typeof normalized.user_settings === 'object')
      ? normalized.user_settings
      : null;
    return {
      id: user.id,
      email: user.email,
      verified: !!user.email_confirmed_at,
      username: normalized?.username || user.user_metadata?.username || (user.email || '').split('@')[0],
      first_name: normalized?.first_name || user.user_metadata?.first_name || metaFirst || null,
      last_name: normalized?.last_name || user.user_metadata?.last_name || metaRest.join(' ') || null,
      phone: normalized?.phone || settings?.phone || null,
      dob: normalized?.dob || settings?.dob || null,
      address: normalized?.address || settings?.address || null,
      plan: normalized?.plan || user.user_metadata?.plan || null,
      accountType: normalized?.accountType || user.user_metadata?.accountType || 'trader',
      companyName: normalized?.companyName || user.user_metadata?.companyName || null,
      teacherSubject: normalized?.teacherSubject || user.user_metadata?.teacherSubject || null,
      teacherBio: normalized?.teacherBio || user.user_metadata?.teacherBio || null,
      collectionName: 'users',
      ...normalized,
      role: admin ? 'admin' : (normalized?.role || user.user_metadata?.role || 'user'),
    };
  }

  const PROFILE_CACHE_PREFIX = 'tb:profile-v1:';
  const PROFILE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

  function readProfileCache(id) {
    if (!id) return null;
    try {
      const raw = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${id}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.ts || Date.now() - parsed.ts > PROFILE_CACHE_TTL) return null;
      return parsed.profile || null;
    } catch {
      return null;
    }
  }

  function writeProfileCache(id, profile) {
    if (!id || !profile) return;
    try {
      localStorage.setItem(`${PROFILE_CACHE_PREFIX}${id}`, JSON.stringify({ ts: Date.now(), profile }));
    } catch { /* ignore quota */ }
  }

  const withProfileTimeout = (promise, ms = 1200) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

  function fetchSessionProfile(session) {
    // A slow users lookup used to run first, then fall back to a second
    // email lookup — up to 3s before the app could render. Run both probes
    // together and take the first one that returns a profile.
    return new Promise((resolve) => {
      let remaining = 2;
      let settled = false;
      const done = (profile) => {
        if (settled) return;
        if (profile) {
          settled = true;
          resolve(profile);
          return;
        }
        remaining -= 1;
        if (remaining === 0) {
          settled = true;
          resolve(null);
        }
      };
      withProfileTimeout(loadProfile(session.user.id)).then(done).catch(() => done(null));
      withProfileTimeout(loadProfileByEmail(session.user.email)).then(done).catch(() => done(null));
    });
  }

  async function provisionFallbackProfile(session) {
    const md = session.user.user_metadata || {};
    const fallbackFirst = md.first_name || null;
    const fallbackLast = md.last_name || null;
    const fallbackUsername = md.username
      || [fallbackFirst, fallbackLast].filter(Boolean).join('').toLowerCase().replace(/[^a-z0-9]/g, '')
      || (session.user.email || '').split('@')[0] || 'user';
    const fallbackName = [fallbackFirst, fallbackLast].filter(Boolean).join(' ') || fallbackUsername;
    const fallbackRole = md.role || (isAdminEmail(session.user.email) ? 'admin' : 'user');
    const fallbackAccountType = md.accountType === 'company'
      ? 'teacher'
      : md.accountType === 'individual'
        ? 'trader'
        : md.accountType || 'trader';
    const fallbackCompanyName = md.companyName || null;

    try {
      // First-login provisioning only: INSERT so an existing row is never
      // clobbered. On PK conflict the row already exists (a slow profile
      // read, not a new user) — leave it untouched.
      const provision = { id: session.user.id, email: session.user.email };
      if (fallbackUsername) { provision.username = fallbackUsername; provision.name = fallbackName; }
      if (fallbackFirst) provision.first_name = fallbackFirst;
      if (fallbackLast) provision.last_name = fallbackLast;
      if (md.dob) provision.dob = md.dob;
      if (md.phone) provision.phone = md.phone;
      if (fallbackRole === 'admin') { provision.role = 'admin'; provision.plan = 'professional'; }
      else if (md.plan && ['pro', 'elite', 'professional'].includes(md.plan)) { provision.plan = md.plan; }
      if (fallbackAccountType) provision.accountType = fallbackAccountType;
      if (fallbackCompanyName) provision.companyName = fallbackCompanyName;
      const { data: createdProfile, error: profileError } = await withProfileTimeout(
        supabase.from('users').insert(provision).select().single(),
        1500,
      );
      if (!profileError && createdProfile) return normalizeProfile(createdProfile, 'users');
    } catch { /* row exists or insert failed — existing data untouched */ }
    return null;
  }

  function applySession(session, profile) {
    authStore.token = session.access_token;
    authStore.record = mapRecord(session.user, profile);
    authStore.isValid = true;
    try {
      localStorage.setItem('tb_auth_provider', 'supabase');
      localStorage.setItem('tb_auth_token', session.access_token);
    } catch { /* ignore */ }
    if (profile) writeProfileCache(session.user.id, profile);
    notifyAuth();
  }

  let authSyncPromise = null;
  let authSyncToken = null;
  let lastSyncedToken = null;
  let lastSyncedAt = 0;

  function syncAuthFromSession(session, { force = false } = {}) {
    if (!session?.user || !session?.access_token) {
      authStore.token = null;
      authStore.record = null;
      authStore.isValid = false;
      lastSyncedToken = null;
      lastSyncedAt = 0;
      localStorage.removeItem('tb_auth_provider');
      localStorage.removeItem('tb_auth_token');
      notifyAuth();
      markAuthReady();
      return Promise.resolve();
    }

    const token = session.access_token;
    if (authSyncPromise && authSyncToken === token) return authSyncPromise;
    if (!force && lastSyncedToken === token && Date.now() - lastSyncedAt < 30000) return Promise.resolve();

    authSyncToken = token;
    authSyncPromise = doSyncAuthFromSession(session).finally(() => {
      if (authSyncToken === token) {
        authSyncPromise = null;
        authSyncToken = null;
      }
    });
    return authSyncPromise;
  }

  async function doSyncAuthFromSession(session) {
    const cached = readProfileCache(session.user.id);
    if (cached) {
      // Returning users render immediately from the last known profile, then
      // refresh silently. No 1–3s blank auth wait on every app open.
      applySession(session, cached);
      markAuthReady();
      lastSyncedToken = session.access_token;
      lastSyncedAt = Date.now();
      fetchSessionProfile(session)
        .then((profile) => {
          if (!profile || authStore.token !== session.access_token) return;
          applySession(session, profile);
        })
        .catch(() => {});
      return;
    }

    try {
      let profile = await fetchSessionProfile(session);
      if (!profile) profile = await provisionFallbackProfile(session);
      applySession(session, profile);
    } catch (e) {
      console.warn('[Auth] syncAuthFromSession failed:', e);
      applySession(session, null);
    } finally {
      markAuthReady();
      lastSyncedToken = session.access_token;
      lastSyncedAt = Date.now();
    }
  }

  // Timeout to prevent auth from hanging indefinitely if Supabase is unreachable
  const authTimeout = setTimeout(() => {
    console.warn('[Auth] Supabase auth initialization timed out, proceeding without auth');
    markAuthReady();
  }, 3000);

  supabase.auth.getSession()
    .then(({ data }) => syncAuthFromSession(data?.session))
    .catch((e) => { console.warn('[Auth] getSession failed:', e); })
    .finally(() => clearTimeout(authTimeout));

  supabase.auth.onAuthStateChange((event, session) => {
    syncAuthFromSession(session, { force: event === 'USER_UPDATED' });
  });

  function collection(table) {
    return {
      async getFullList(options = {}) {
        const sortVariants = buildSortVariants(options.sort);
        let lastError;
        for (const sortSpec of sortVariants) {
          let query = supabase.from(table).select('*');
          query = applyFilter(query, options.filter);
          query = applySort(query, sortSpec);
          const { data, error } = await query;
          if (!error) return data || [];
          if (!isMissingColumnError(error)) throw error;
          lastError = error;
        }
        throw lastError;
      },

      async getList(page = 1, perPage = 30, options = {}) {
        const from = Math.max(0, (page - 1) * perPage);
        const to = from + perPage - 1;
        const sortVariants = buildSortVariants(options.sort);
        let lastError;
        for (const sortSpec of sortVariants) {
          let query = supabase.from(table).select('*', { count: 'exact' });
          query = applyFilter(query, options.filter);
          query = applySort(query, sortSpec);
          const { data, error, count } = await query.range(from, to);
          if (!error) {
            const totalItems = count || 0;
            const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
            return { page, perPage, totalItems, totalPages, items: data || [] };
          }
          if (!isMissingColumnError(error)) throw error;
          lastError = error;
        }
        throw lastError;
      },

      async getFirstListItem(filter) {
        let query = supabase.from(table).select('*');
        query = applyFilter(query, filter);
        const { data, error } = await query.limit(1);
        if (error) throw error;
        if (!data?.length) throw new Error('No matching record found');
        return data[0];
      },

      async create(data) {
        if (table === 'users') {
          throw new Error('Direct user creation is disabled. Use one-time email code signup.');
        }

        const payload = { ...data };
        const shouldScopeOwner = table !== 'admin_platform_settings';
        if (shouldScopeOwner && authStore.record?.id && payload.owner === undefined) payload.owner = authStore.record.id;
        const { data: created, error } = await supabase.from(table).insert(payload).select().single();
        if (error && isSchemaCacheColumnError(error) && shouldScopeOwner) {
          delete payload.owner;
          const retry = await supabase.from(table).insert(payload).select().single();
          if (retry.error) throw retry.error;
          return retry.data;
        }
        if (error) throw error;
        return created;
      },

      async upsert(data, options = {}) {
        const payload = { ...data };
        const onConflict = typeof options === 'string' ? options : (options.onConflict || 'id');
        const shouldScopeOwner = table !== 'admin_platform_settings';
        if (shouldScopeOwner && authStore.record?.id && payload.owner === undefined) payload.owner = authStore.record.id;
        const { data: row, error } = await supabase
          .from(table)
          .upsert(payload, { onConflict })
          .select()
          .single();
        if (error && isSchemaCacheColumnError(error) && shouldScopeOwner) {
          delete payload.owner;
          const retry = await supabase.from(table).upsert(payload, { onConflict }).select().single();
          if (retry.error) throw retry.error;
          return retry.data;
        }
        if (error) throw error;
        return row;
      },

      async update(id, patch) {
        if (table === 'users' && authStore.record?.id === id) {
          const authPatch = {};
          if (patch.email) authPatch.email = patch.email;
          const metadataPatch = {};
          if (patch.username) metadataPatch.username = patch.username;
          if (patch.role) metadataPatch.role = patch.role;
          if (patch.plan) metadataPatch.plan = patch.plan;
          if (patch.accountType) metadataPatch.accountType = patch.accountType;
          if (patch.companyName !== undefined) metadataPatch.companyName = patch.companyName;
          if (Object.keys(metadataPatch).length) authPatch.data = metadataPatch;
          if (Object.keys(authPatch).length) {
            const { error: authError } = await supabase.auth.updateUser(authPatch);
            if (authError) throw authError;
          }
        }

        if (table === 'users') {
          // The users table has no first_name / last_name / phone / dob
          // columns — names live in auth metadata, phone/dob inside
          // user_settings. Split the patch so profile saves actually persist
          // instead of failing on unknown columns.
          const isForm = patch != null && typeof patch === 'object' && typeof patch.get === 'function';
          const tablePatch = isForm ? patch : { ...patch };
          let identity = null;
          let settings = null;
          let contact = null;
          let metaError = null;
          // Auth metadata belongs to the signed-in user only — never write
          // another user's names into our own session (admin editing others).
          const isSelf = String(id) === String(authStore.record?.id);
          if (!isForm) {
            identity = {};
            for (const k of ['first_name', 'last_name']) {
              // Compulsory names: blank values never erase stored identity.
              if (tablePatch[k] !== undefined && String(tablePatch[k]).trim() !== '') { identity[k] = String(tablePatch[k]).trim(); }
              delete tablePatch[k];
            }
            if (!Object.keys(identity).length) identity = null;
            contact = {};
            for (const k of ['phone', 'dob', 'address']) {
              if (tablePatch[k] !== undefined) { contact[k] = tablePatch[k]; delete tablePatch[k]; }
            }
            if (!Object.keys(contact).length) contact = null;
            if (contact) {
              const base = (authStore.record?.user_settings && typeof authStore.record.user_settings === 'object')
                ? authStore.record.user_settings
                : {};
              settings = { ...base, ...contact };
              tablePatch.user_settings = settings;
            }
            if (identity && isSelf) {
              try {
                const { error: mErr } = await supabase.auth.updateUser({ data: identity });
                if (mErr) throw mErr;
              } catch (e) { metaError = e; }
            }
            if (!Object.keys(tablePatch).length) {
              if (metaError) throw metaError;
              const merged = { ...(authStore.record || {}), ...(identity || {}), ...(contact || {}), ...(settings ? { user_settings: settings } : {}) };
              authStore.record = merged;
              notifyAuth();
              return merged;
            }
          }
          const { data: updated, error } = await supabase.from('users').update(tablePatch).eq('id', id).select().single();
          if (!error) {
            const merged = { ...updated, ...(identity || {}), ...(contact || {}), ...(settings ? { user_settings: settings } : {}) };
            authStore.record = merged;
            notifyAuth();
            return merged;
          }

          const upsertPayload = { ...(typeof tablePatch === 'object' && !(typeof tablePatch.get === 'function') ? tablePatch : {}), id };
          const { data: upserted, error: upsertError } = await supabase.from('users').upsert(upsertPayload).select().single();
          if (!upsertError && upserted) {
            const merged = { ...upserted, ...(identity || {}), ...(contact || {}), ...(settings ? { user_settings: settings } : {}) };
            authStore.record = merged;
            notifyAuth();
            return merged;
          }

          if (isMissingRelationError(error) || isMissingRelationError(upsertError)) {
            const profilePatch = {};
            if (patch.email) profilePatch.email = patch.email;
            if (patch.role) profilePatch.user_role = patch.role === 'admin' ? 'admin' : patch.role === 'company' ? 'company' : patch.role === 'teacher' ? 'teacher' : 'student';
            if (!Object.keys(profilePatch).length) {
              return authStore.record ? { ...authStore.record, ...patch } : patch;
            }
            const { data: updatedProfile, error: profileError } = await supabase.from('profiles').update(profilePatch).eq('id', id).select().single();
            if (profileError) throw profileError;
            return normalizeProfile(updatedProfile, 'profiles');
          }

          throw upsertError || error;
        }

        const { data: updated, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
        if (error) throw error;
        return updated;
      },

      async delete(id) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      },

      async authWithOAuth2(providerOrOptions) {
        const provider = typeof providerOrOptions === 'string'
          ? providerOrOptions
          : providerOrOptions?.provider;
        const redirectTo = providerOrOptions?.redirectUrl || `${window.location.origin}/login`;
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) throw error;
        return { token: authStore.token, record: authStore.record };
      },

      async authRefresh() {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        return { record: mapRecord(data?.user, await loadProfile(data?.user?.id)) };
      },

      async requestEmailChange(email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
      },

      async requestOTP(input) {
        const options = typeof input === 'string' ? { email: input } : (input || {});
        const email = String(options.email || '').trim();
        if (!email) throw new Error('Email is required.');

        const rawType = options.accountType === 'company' ? 'teacher' : options.accountType === 'individual' ? 'trader' : options.accountType || 'trader';
        const metadata = {
          username: options.username || [options.first_name, options.last_name].filter(Boolean).join('').toLowerCase().replace(/[^a-z0-9]/g, '') || email.split('@')[0],
          first_name: options.first_name || null,
          last_name: options.last_name || null,
          dob: options.dob || null,
          phone: options.phone || null,
          role: isAdminEmail(email) ? 'admin' : (options.role || 'user'),
          accountType: rawType,
          teacherSubject: rawType === 'teacher' ? String(options.teacherSubject || '').slice(0, 120) : null,
          teacherBio: rawType === 'teacher' ? String(options.teacherBio || '').slice(0, 2000) : null,
        };

        const createUserOnLogin = options.shouldCreateUser !== false;

        const { error } = await withTimeout(supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: createUserOnLogin,
            data: metadata,
            emailRedirectTo: `${window.location.origin}/login`,
          },
        }), 30000, 'Sending the sign-in code');
        if (error) throw error;
        return { otpId: email, shouldCreateUser: createUserOnLogin };
      },

      async authWithOTP(otpId, code) {
        const email = String(otpId || '').trim();
        let token = String(code || '').trim();
        if (!email || !token) throw new Error('Email and code are required.');
        // Accept a pasted magic link too: pull the token out of the URL.
        const m = token.match(/[?&]token=([^&#\s]+)/);
        if (m) { try { token = decodeURIComponent(m[1]); } catch { token = m[1]; } }
        token = token.replace(/\s+/g, '');
        // Short numeric codes verify as email OTP; long link-tokens verify as magiclink.
        const type = token.length > 10 ? 'magiclink' : 'email';
        const { data, error } = await withTimeout(supabase.auth.verifyOtp({
          email,
          token,
          type,
        }), 30000, 'Verifying the code');
        if (error) throw error;
        await syncAuthFromSession(data?.session);
        return { token: authStore.token, record: authStore.record };
      },
    };
  }

  return {
    authStore,
    collection,
    files: {
      getURL(record, fileField) {
        return record?.[fileField] || '';
      },
      async getToken() {
        return '';
      },
    },
  };
}

function createSupabaseRequiredClient() {
  const missingError = () => new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  return {
    authStore: {
      token: null,
      record: null,
      isValid: false,
      onChange() {
        return () => {};
      },
      clear() {},
    },
    collection() {
      return {
        getFullList: async () => { throw missingError(); },
        getList: async () => { throw missingError(); },
        getFirstListItem: async () => { throw missingError(); },
        create: async () => { throw missingError(); },
        update: async () => { throw missingError(); },
        delete: async () => { throw missingError(); },
        authWithOAuth2: async () => { throw missingError(); },
        authRefresh: async () => { throw missingError(); },
        requestEmailChange: async () => { throw missingError(); },
        requestOTP: async () => { throw missingError(); },
        authWithOTP: async () => { throw missingError(); },
      };
    },
    files: {
      getURL() {
        return '';
      },
      async getToken() {
        throw missingError();
      },
    },
  };
}

const pocketbaseClient = USE_SUPABASE
  ? createSupabaseCompatClient()
  : createSupabaseRequiredClient();

export default pocketbaseClient;
export { pocketbaseClient };
