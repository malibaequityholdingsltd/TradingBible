import { useCallback, useEffect, useState } from 'react';
import { API_SERVER_URL } from './apiServerClient';

export function usePublicTbStockDocuments() {
  const [documents, setDocuments] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_SERVER_URL}/tb-stock/documents`);
      if (!res.ok) throw new Error(`TB stock document library unavailable (${res.status})`);
      const data = await res.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setMeta(data);
    } catch (err) {
      setError(err?.message || 'TB stock document library unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { documents, meta, loading, error, reload: load };
}

export function publicTbStockDocxUrl(slug) {
  return `${API_SERVER_URL}/tb-stock/documents/${encodeURIComponent(slug)}/docx`;
}
