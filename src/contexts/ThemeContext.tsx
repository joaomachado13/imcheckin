import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'orange-liquid' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'imcheckin_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return saved === 'dark' ? 'dark' : 'orange-liquid';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-orange-liquid', 'dark');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('theme-orange-liquid');
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};
