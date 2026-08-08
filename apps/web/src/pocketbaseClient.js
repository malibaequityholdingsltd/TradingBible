import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

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

function isMissingRelationError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('relation') && message.includes('does not exist');
}

async function hasExistingAppAccount(supabase, email) {
  const tables = ['users', 'profiles'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').eq('email', email).limit(1);
    if (error) {
      if (isMissingRelationError(error)) continue;
      throw error;
    }
    if (data?.length) return true;
  }
  return false;
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
      supabase.auth.signOut();
    },
  };

  const notifyAuth = () => {
    listeners.forEach((cb) => cb(authStore.token, authStore.record));
  };

  function normalizeProfile(profile, source = 'users') {
    if (!profile) return null;
    return {
      ...profile,
      profileSource: source,
      role: profile.role || profile.user_role || 'user',
      accountType: profile.accountType || profile.account_type || 'individual',
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

  function mapRecord(user, profile) {
    if (!user) return null;
    const normalized = normalizeProfile(profile, profile?.profileSource || 'users');
    return {
      id: user.id,
      email: user.email,
      verified: !!user.email_confirmed_at,
      username: normalized?.username || user.user_metadata?.username || (user.email || '').split('@')[0],
      role: normalized?.role || user.user_metadata?.role || 'user',
      plan: normalized?.plan || user.user_metadata?.plan || 'trial',
      accountType: normalized?.accountType || user.user_metadata?.accountType || 'individual',
      companyName: normalized?.companyName || user.user_metadata?.companyName || null,
      collectionName: 'users',
      ...normalized,
    };
  }

  async function syncAuthFromSession(session) {
    if (!session?.user || !session?.access_token) {
      authStore.token = null;
      authStore.record = null;
      authStore.isValid = false;
      localStorage.removeItem('tb_auth_provider');
      localStorage.removeItem('tb_auth_token');
      notifyAuth();
      markAuthReady();
      return;
    }

    let profile = await loadProfile(session.user.id);
    if (!profile) {
      const fallbackUsername = session.user.user_metadata?.username || (session.user.email || '').split('@')[0] || 'user';
      const fallbackRole = session.user.user_metadata?.role || 'user';
      const fallbackAccountType = session.user.user_metadata?.accountType || 'individual';
      const fallbackCompanyName = session.user.user_metadata?.companyName || null;
      const { data: createdProfile, error: profileError } = await supabase.from('users')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          username: fallbackUsername,
          name: fallbackUsername,
          role: fallbackRole,
          accountType: fallbackAccountType,
          companyName: fallbackCompanyName,
          plan: fallbackRole === 'admin' ? 'professional' : 'trial',
        })
        .select()
        .single();
      if (!profileError && createdProfile) {
        profile = normalizeProfile(createdProfile, 'users');
      } else {
        profile = await loadProfile(session.user.id);
      }
    }
    authStore.token = session.access_token;
    authStore.record = mapRecord(session.user, profile);
    authStore.isValid = true;
    localStorage.setItem('tb_auth_provider', 'supabase');
    localStorage.setItem('tb_auth_token', session.access_token);
    notifyAuth();
    markAuthReady();
  }

  supabase.auth.getSession().then(({ data }) => syncAuthFromSession(data?.session));
  supabase.auth.onAuthStateChange((_event, session) => {
    syncAuthFromSession(session);
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
        if (authStore.record?.id && payload.owner === undefined) payload.owner = authStore.record.id;
        const { data: created, error } = await supabase.from(table).insert(payload).select().single();
        if (error) throw error;
        return created;
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
          const { data: updated, error } = await supabase.from('users').update(patch).eq('id', id).select().single();
          if (!error) return updated;

          const upsertPayload = { ...patch, id };
          const { data: upserted, error: upsertError } = await supabase.from('users').upsert(upsertPayload).select().single();
          if (!upsertError && upserted) return upserted;

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

      async authWithPassword(email, password) {
        const cleanEmail = String(email || '').trim();
        const cleanPassword = String(password || '');
        if (!cleanEmail || !cleanPassword) throw new Error('Email and password are required.');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (error) throw error;
        await syncAuthFromSession(data?.session);
        return { token: authStore.token, record: authStore.record };
      },

      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
        if (error) throw error;
      },

      async completePasswordReset(password) {
        const cleanPassword = String(password || '');
        if (!cleanPassword) throw new Error('Password is required.');
        const { error } = await supabase.auth.updateUser({ password: cleanPassword });
        if (error) throw error;
        return { token: authStore.token, record: authStore.record };
      },

      async requestEmailChange(email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
      },

      async requestOTP(input) {
        const options = typeof input === 'string' ? { email: input } : (input || {});
        const email = String(options.email || '').trim();
        if (!email) throw new Error('Email is required.');

        const metadata = {
          username: options.username || email.split('@')[0],
          role: options.role || 'user',
          accountType: options.accountType || 'individual',
          companyName: options.accountType === 'company' ? (options.companyName || options.username || email.split('@')[0]) : null,
        };

        const createUserOnLogin = options.shouldCreateUser !== false
          || await hasExistingAppAccount(supabase, email);

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: createUserOnLogin,
            data: metadata,
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (error) throw error;
        return { otpId: email, shouldCreateUser: createUserOnLogin };
      },

      async authWithOTP(otpId, code) {
        const email = String(otpId || '').trim();
        const token = String(code || '').trim();
        if (!email || !token) throw new Error('Email and code are required.');
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });
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
        authWithPassword: async () => { throw missingError(); },
        authWithOAuth2: async () => { throw missingError(); },
        authRefresh: async () => { throw missingError(); },
        requestPasswordReset: async () => { throw missingError(); },
        completePasswordReset: async () => { throw missingError(); },
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
