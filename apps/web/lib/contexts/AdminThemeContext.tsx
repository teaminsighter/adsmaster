'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface AdminThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextType | null>(null);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('admin_theme') as Theme;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme);
    }
  }, []);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('admin_theme', newTheme);
  };

  const toggleTheme = () => {
    handleSetTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <AdminThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextType {
  const context = useContext(AdminThemeContext);
  if (!context) {
    // Return default values if not in provider
    return {
      theme: 'dark',
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
