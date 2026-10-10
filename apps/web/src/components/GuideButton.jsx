import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';

// Floating Pro Guide button: one tap to the full guide from anywhere.
// Stacked above the chat bubble (bottom-right). Badge shows missions done.
export default function GuideButton() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [done, setDone] = useState(0);

  useEffect(() => {
    try {
      const manual = JSON.parse(localStorage.getItem('tb:guide-done-v1') || '[]');
      setDone(Array.isArray(manual) ? manual.length : 0);
    } catch { setDone(0); }
  }, [pathname]);

  if (pathname === '/app/guide') return null;

  return (
    <button
      onClick={() => nav('/app/guide')}
      aria-label="Open Pro Guide"
      title={`Pro Guide — ${done}/24 missions done`}
      className="fixed bottom-[78px] right-3 z-[65] grid h-12 w-12 place-items-center rounded-full border border-[#d4af37]/40 bg-[#0c0c11]/95 shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur transition-transform hover:scale-105"
    >
      <Compass className="h-5 w-5 text-[#d4af37]" />
      {done > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-1 font-mono text-[10px] font-bold text-[#0a0a0f]">
          {done}
        </span>
      )}
    </button>
  );
}
