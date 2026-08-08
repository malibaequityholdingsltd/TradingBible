import React, { useEffect, useState } from 'react';
import { Copy, KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import pb from '@/lib/pocketbaseClient';
import { useToast } from '@/hooks/use-toast';

function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'tb_usr_';
  for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
  return key;
}

export default function UserApiKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await pb.collection('user_api_keys').getFullList({ sort: '-created' });
      setKeys(list);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to load API keys', description: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Key name required' });
      return;
    }
    setCreating(true);
    try {
      const plain = generateKey();
      const created = await pb.collection('user_api_keys').create({
        name: name.trim(),
        keyPrefix: plain.slice(0, 10),
        keyHash: btoa(plain),
        status: 'active',
      });
      setKeys((prev) => [created, ...prev]);
      setNewKey(plain);
      setName('');
      toast({ title: 'API key created', description: 'Copy it now. It is shown once.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to create key', description: err?.message || 'Please try again.' });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id) => {
    try {
      await pb.collection('user_api_keys').update(id, { status: 'revoked' });
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)));
      toast({ title: 'API key revoked' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to revoke key', description: err?.message || 'Please try again.' });
    }
  };

  const remove = async (id) => {
    try {
      await pb.collection('user_api_keys').delete(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: 'API key deleted' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to delete key', description: err?.message || 'Please try again.' });
    }
  };

  return (
    <AppLayout title="API Keys">
      <div className="glass rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-[#f0ecdd]">Create personal API keys</h2>
        <p className="mt-1 text-sm text-[#8a8577]">Use these keys to connect your TradingBible account to your integrations.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g., TradingView bot)"
            className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/40"
          />
          <button
            type="button"
            onClick={createKey}
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Creating...' : 'Create key'}
          </button>
        </div>
        {newKey && (
          <div className="mt-4 rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] p-3">
            <div className="text-xs text-[#8a8577]">Copy this key now (shown once)</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-black/20 px-2 py-1.5 text-xs text-[#f0ecdd]">{newKey}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(newKey); toast({ title: 'Copied' }); }}
                className="rounded-lg border border-[#d4af37]/25 p-2 text-[#d4af37] hover:border-[#d4af37]/50"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-[#f0ecdd]">Your keys</h3>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[#d4af37]/15 px-3 py-2 text-xs text-[#d4af37]">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="text-sm text-[#8a8577]">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[#8a8577]"><KeyRound className="h-4 w-4" /> No API keys yet.</div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-col gap-3 rounded-xl border border-[#d4af37]/12 bg-[#0f0f14] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-[#f0ecdd]">{k.name || 'Untitled key'}</div>
                  <div className="text-xs text-[#8a8577]">Prefix: {k.keyPrefix || 'tb_usr_***'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${k.status === 'revoked' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {k.status || 'active'}
                  </span>
                  {k.status !== 'revoked' && (
                    <button type="button" onClick={() => revoke(k.id)} className="rounded-lg border border-[#d4af37]/25 px-3 py-1.5 text-xs text-[#c9c4b4]">
                      Revoke
                    </button>
                  )}
                  <button type="button" onClick={() => remove(k.id)} className="rounded-lg border border-red-500/30 p-1.5 text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
