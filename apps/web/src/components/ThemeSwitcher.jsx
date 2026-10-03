import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeSwitcher({ className = '' }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'light' ? false : true;
    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className={`fixed bottom-5 right-5 z-[60] grid h-11 w-11 place-items-center rounded-full border shadow-lg backdrop-blur transition hover:scale-105 active:scale-95 ${isDark ? 'border-[#d4af37]/40 bg-[#0f0f14]/80 text-[#d4af37] hover:border-[#d4af37]' : 'border-[#a67c1e]/40 bg-[#fffef9]/90 text-[#a67c1e] hover:border-[#a67c1e]'} ${className}`}
        >
            {isDark ? <Sun className="h-5 w-5" strokeWidth={1.8} /> : <Moon className="h-5 w-5" strokeWidth={1.8} />}
        </button>
    );
}
