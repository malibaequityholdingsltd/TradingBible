import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeSwitcher({ className = '', inline = false }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'light' ? false : true;
    if (inline) {
        return (
            <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                title={isDark ? 'Light mode' : 'Dark mode'}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent text-[#d4af37] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.6)] transition hover:border-[#d4af37]/50 hover:shadow-[0_0_16px_-4px_rgba(212,175,55,0.5)] active:scale-95 ${className}`}
            >
                {isDark ? <Sun className="h-4 w-4" strokeWidth={1.8} /> : <Moon className="h-4 w-4" strokeWidth={1.8} />}
            </button>
        );
    }
    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className={`fixed bottom-5 right-5 z-[60] grid h-10 w-10 place-items-center rounded-[10px] border shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] backdrop-blur transition hover:scale-105 active:scale-95 ${isDark ? 'border-[#d4af37]/40 bg-[#0f0f14]/90 text-[#d4af37] hover:border-[#d4af37] hover:shadow-[0_0_20px_-4px_rgba(212,175,55,0.5)]' : 'border-[#a67c1e]/40 bg-[#fffef9]/95 text-[#a67c1e] hover:border-[#a67c1e]'} ${className}`}
        >
            {isDark ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        </button>
    );
}
