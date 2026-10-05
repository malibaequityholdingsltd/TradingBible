import React, { useEffect, useState } from 'react';
import { Copy, KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, EmptyState, GoldButton, SectionHead } from '@/components/ui-kit';
import { useI18n } from '@/lib/i18n';
import pb from '@/lib/pocketbaseClient';
import { useToast } from '@/hooks/use-toast';

function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'tb_usr_';
  for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
  return key;
}

export default function UserApiKeysPage() {
  const { t } = useI18n();
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
      toast({ variant: 'destructive', title: t('uak.loadFail'), description: err?.message || t('uak.tryAgain') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: t('uak.nameRequired') });
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
      toast({ title: t('uak.keyCreated'), description: t('uak.keyCreatedSub') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('uak.keyCreateFail'), description: err?.message || t('uak.tryAgain') });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id) => {
    try {
      await pb.collection('user_api_keys').update(id, { status: 'revoked' });
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)));
      toast({ title: t('uak.revoked') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('uak.revokeFail'), description: err?.message || t('uak.tryAgain') });
    }
  };

  const remove = async (id) => {
    try {
      await pb.collection('user_api_keys').delete(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: t('uak.deleted') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('uak.deleteFail'), description: err?.message || t('uak.tryAgain') });
    }
  };

  const activeCount = keys.filter((k) => k.status !== 'revoked').length;
  const revokedCount = keys.length - activeCount;

  return (
    <AppLayout title={t('uak.pageTitle')}>
      <div className="tb-page">
      <section className="tb-hero overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#d4af37]/15 blur-[100px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]">
              <KeyRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold tracking-tight text-[#f0ecdd] sm:text-2xl">{t('uak.pageTitle')}</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#8a8577] sm:text-sm">{t('uak.createSub')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] text-emerald-300">{activeCount} active</span>
            {revokedCount > 0 && <span className="rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 font-mono text-[11px] text-red-300">{revokedCount} revoked</span>}
          </div>
        </div>
      </section>

      <Card>
        <SectionHead icon={Plus} title={t('uak.createTitle')} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createKey(); }}
            placeholder={t('uak.namePh')}
            className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/50"
          />
          <GoldButton
            type="button"
            onClick={createKey}
            disabled={creating}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            {creating ? t('uak.creating') : t('uak.create')}
          </GoldButton>
        </div>
        {newKey && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{t('uak.copyNow')}</div>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto no-scrollbar whitespace-nowrap rounded-xl bg-black/30 px-3 py-2.5 font-mono text-xs text-[#f0ecdd]">{newKey}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(newKey); toast({ title: t('uak.copied') }); }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d4af37]/25 text-[#d4af37] transition hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10"
                aria-label={t('uak.copied')}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionHead
          icon={KeyRound}
          title={t('uak.yourKeys')}
          right={(
            <button type="button" onClick={load} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#d4af37]/15 px-3 py-2 text-xs text-[#d4af37] transition hover:border-[#d4af37]/40" aria-label={t('uak.refresh')}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t('uak.refresh')}
            </button>
          )}
        />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" />{t('uak.loading')}</div>
        ) : keys.length === 0 ? (
          <EmptyState icon={KeyRound} title={t('uak.noKeys')} />
        ) : (
          <div className="space-y-2.5">
            {keys.map((k) => (
              <div key={k.id} className={`group flex flex-col gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${k.status === 'revoked' ? 'border-white/[0.06] bg-white/[0.02] opacity-70' : 'border-[#d4af37]/12 bg-[#0f0f14] hover:border-[#d4af37]/30'}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.status === 'revoked' ? 'bg-white/[0.04] text-[#6a665a]' : 'bg-[#d4af37]/12 text-[#d4af37]'}`}>
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#f0ecdd]">{k.name || t('uak.untitled')}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#8a8577]">{k.keyPrefix || 'tb_usr_***'}••••••••</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${k.status === 'revoked' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {k.status === 'revoked' ? t('uak.st_revoked') : t('uak.st_active')}
                  </span>
                  {k.status !== 'revoked' && (
                    <button type="button" onClick={() => revoke(k.id)} className="rounded-xl border border-[#d4af37]/25 px-3.5 py-2 text-xs font-semibold text-[#c9c4b4] transition hover:border-[#d4af37]/50 hover:text-[#e9e7df]">
                      {t('uak.revoke')}
                    </button>
                  )}
                  <button type="button" onClick={() => remove(k.id)} aria-label="Delete" className="grid h-9 w-9 place-items-center rounded-xl border border-red-500/25 text-red-400 transition hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>
    </AppLayout>
  );
}
