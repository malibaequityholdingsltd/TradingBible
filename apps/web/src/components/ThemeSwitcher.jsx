import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { IosIcon } from '@/components/IosIcon';

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
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition active:scale-95 ${className}`}
            >
                <IosIcon icon={isDark ? Sun : Moon} size="sm" tone="theme" />
            </button>
        );
    }
    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className={`fixed bottom-5 right-5 z-[60] grid h-11 w-11 place-items-center rounded-[12px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.75)] backdrop-blur transition hover:scale-105 active:scale-95 ${className}`}
        >
            <IosIcon icon={isDark ? Sun : Moon} size="md" tone="theme" />
        </button>
    );
}
