import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { INDICATOR_DEFS } from '@/lib/indicators';

const COLORS = ['#d4af37', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#f59e0b', '#e06666'];

// Modal to add/remove indicators, tune parameters and save/load presets.
export default function IndicatorPicker({ open, onClose, indicators, setIndicators }) {
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tb_indicator_presets') || '[]'); } catch { return []; }
  });
  const [presetName, setPresetName] = useState('');

  if (!open) return null;

  const add = (type) => {
    const def = INDICATOR_DEFS[type];
    setIndicators([...indicators, { id: `${type}-${Date.now()}`, type, params: { ...def.defaults }, color: def.color }]);
  };
  const remove = (id) => setIndicators(indicators.filter((i) => i.id !== id));
  const updateParam = (id, key, value) => setIndicators(indicators.map((i) => i.id === id ? { ...i, params: { ...i.params, [key]: Number(value) || value } } : i));
  const updateColor = (id, color) => setIndicators(indicators.map((i) => i.id === id ? { ...i, color } : i));

  const savePreset = () => {
    if (!presetName.trim()) return;
    const next = [...presets.filter((p) => p.name !== presetName.trim()), { name: presetName.trim(), indicators }];
    setPresets(next); localStorage.setItem('tb_indicator_presets', JSON.stringify(next)); setPresetName('');
  };
  const loadPreset = (p) => setIndicators(p.indicators.map((i) => ({ ...i, id: `${i.type}-${Date.now()}-${Math.random()}` })));
  const deletePreset = (name) => { const next = presets.filter((p) => p.name !== name); setPresets(next); localStorage.setItem('tb_indicator_presets', JSON.stringify(next)); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="glass max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-[#d4af37]/12 bg-[#0d0d12]/95 px-5 py-4 backdrop-blur">
          <h3 className="font-semibold text-[#f0ecdd]">Technical Indicators</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-[#8a8577]" /></button>
        </div>

        <div className="p-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#5f5b50]">Add indicator</p>
          <div className="mb-5 flex flex-wrap gap-2">
            {Object.entries(INDICATOR_DEFS).map(([type, def]) => (
              <button key={type} onClick={() => add(type)}
                className="flex items-center gap-1 rounded-lg border border-[#d4af37]/15 bg-white/5 px-2.5 py-1.5 text-xs text-[#e9e7df] transition hover:border-[#d4af37]/40">
                <Plus className="h-3 w-3 text-[#d4af37]" />{def.label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#5f5b50]">Active ({indicators.length})</p>
          <div className="space-y-2">
            {indicators.length === 0 && <p className="text-xs text-[#8a8577]">No indicators added yet.</p>}
            {indicators.map((ind) => {
              const def = INDICATOR_DEFS[ind.type];
              return (
                <div key={ind.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#f0ecdd]">{def.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] uppercase text-[#8a8577]">{def.pane === 'price' ? 'Overlay' : 'Panel'}</span>
                      <button onClick={() => remove(ind.id)}><Trash2 className="h-3.5 w-3.5 text-red-400/70 hover:text-red-400" /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {Object.entries(def.defaults).map(([key]) => (
                      <label key={key} className="flex items-center gap-1.5 text-xs text-[#8a8577]">
                        <span className="capitalize">{key}</span>
                        <input type="number" value={ind.params[key]} onChange={(e) => updateParam(ind.id, key, e.target.value)}
                          className="w-16 rounded-md border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 text-[#e9e7df] outline-none" />
                      </label>
                    ))}
                    <div className="flex items-center gap-1">
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => updateColor(ind.id, c)} className={`h-4 w-4 rounded-full border ${ind.color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-white/8 pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#5f5b50]">Presets</p>
            <div className="flex gap-2">
              <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name"
                className="flex-1 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-xs text-[#e9e7df] outline-none" />
              <button onClick={savePreset} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-2 text-xs font-semibold text-[#0a0a0f]"><Save className="h-3.5 w-3.5" />Save</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {presets.map((p) => (
                <span key={p.name} className="flex items-center gap-1.5 rounded-full border border-[#d4af37]/15 bg-white/5 px-2.5 py-1 text-xs text-[#e9e7df]">
                  <button onClick={() => loadPreset(p)} className="hover:text-[#d4af37]">{p.name}</button>
                  <button onClick={() => deletePreset(p.name)}><X className="h-3 w-3 text-[#8a8577]" /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
