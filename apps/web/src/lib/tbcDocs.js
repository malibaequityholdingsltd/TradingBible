import { useCallback, useEffect, useState } from 'react';
import { API_SERVER_URL } from './apiServerClient';

export function usePublicTbcDocuments() {
  const [documents, setDocuments] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/documents`);
      if (!res.ok) throw new Error(`Document library unavailable (${res.status})`);
      const data = await res.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setMeta(data);
    } catch (err) {
      setError(err?.message || 'Document library unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { documents, meta, loading, error, reload: load };
}

export function publicPdfUrl(slug) {
  return `${API_SERVER_URL}/tbc/documents/${encodeURIComponent(slug)}/file`;
}

export function publicDocxUrl(slug) {
  return `${API_SERVER_URL}/tbc/documents/${encodeURIComponent(slug)}/docx`;
}
