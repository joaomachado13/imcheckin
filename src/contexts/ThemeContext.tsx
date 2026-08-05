import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'orange-liquid' | 'soft-light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  hasSeenNotice: boolean;
  dismissNotice: () => void;
  showNoticeAgain: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'imcheckin_theme_mode';
const NOTICE_STORAGE_KEY = 'imcheckin_theme_notice_seen';

const VALID_THEMES: ThemeMode[] = ['orange-liquid', 'soft-light', 'dark'];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return saved && VALID_THEMES.includes(saved) ? saved : 'orange-liquid';
  });

  const [hasSeenNotice, setHasSeenNotice] = useState<boolean>(
    () => localStorage.getItem(NOTICE_STORAGE_KEY) === 'true'
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-orange-liquid', 'theme-soft-light', 'dark');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'soft-light') {
      root.classList.add('theme-soft-light');
    } else {
      root.classList.add('theme-orange-liquid');
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const dismissNotice = () => {
    localStorage.setItem(NOTICE_STORAGE_KEY, 'true');
    setHasSeenNotice(true);
  };

  const showNoticeAgain = () => {
    localStorage.removeItem(NOTICE_STORAGE_KEY);
    setHasSeenNotice(false);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, hasSeenNotice, dismissNotice, showNoticeAgain }}>
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
