import { useCallback, useEffect, useState } from 'react';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

export function authToken() {
  try {
    return pb.authStore.token || '';
  } catch {
    return '';
  }
}

export async function investorFetch(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = authToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_SERVER_URL}/investor${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    const error = new Error(payload?.message || payload?.error?.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function useInvestorOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await investorFetch('/public/overview');
      setData(payload);
    } catch (err) {
      setError(err.message || 'Investor information is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

export function useAdminInvestor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await investorFetch('/admin/overview', { auth: true });
      setData(payload);
    } catch (err) {
      setError(err.message || 'The investor operations console is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

export function useShareholderPortal(enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await investorFetch('/portal', { auth: true });
      setData(payload);
    } catch (err) {
      setError(err.message || 'The shareholder portal is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}
