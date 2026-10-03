import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext({ theme: 'dark', setTheme: () => {}, toggleTheme: () => {} });

const STORAGE_KEY = 'tb-theme';

function getInitialTheme() {
    if (typeof window === 'undefined') return 'dark';
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* ignore */ }
    // Dark-first brand (matte-black + gold): never auto-switch to light
    // based on OS preference. Light is explicit opt-in via the toggle.
    return 'dark';
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

    useEffect(() => { applyThemeClass(theme); }, [theme]);

    const setTheme = useCallback((next) => {
        setThemeState(next);
        try { window.localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try { window.localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
            return next;
        });
    }, []);

    // No auto-follow of OS theme: light mode is explicit opt-in only,
    // so users never land in light unexpectedly. Listener removed.

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
