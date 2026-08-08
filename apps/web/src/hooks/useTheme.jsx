import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext({ theme: 'dark', setTheme: () => {}, toggleTheme: () => {} });

const STORAGE_KEY = 'tb-theme';

function getSystemTheme() {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
}

function getInitialTheme() {
    if (typeof window === 'undefined') return 'dark';
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* ignore */ }
    return getSystemTheme();
}

function applyThemeClass(theme) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getInitialTheme);
    const [userOverride, setUserOverride] = useState(() => {
        try { return !!window.localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
    });

    useEffect(() => { applyThemeClass(theme); }, [theme]);

    const setTheme = useCallback((next) => {
        setThemeState(next);
        setUserOverride(true);
        try { window.localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try { window.localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
            return next;
        });
        setUserOverride(true);
    }, []);

    // Listen for system preference changes when the user has NOT overridden.
    useEffect(() => {
        if (!window.matchMedia) return undefined;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            if (!userOverride) setThemeState(e.matches ? 'dark' : 'light');
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [userOverride]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

export default useTheme;
