import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme] = useState('dark');

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('docmind_theme', 'dark');
    }, []);

    const toggleTheme = () => {}; // No-op, just in case any component still calls it

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
