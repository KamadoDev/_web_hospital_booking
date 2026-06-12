"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

type ThemeMode = "light";

type ThemeContextValue = {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const storageKey = "hospital-dashboard-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.classList.remove("theme-dark");
    document.documentElement.classList.add("theme-light");
    document.documentElement.style.colorScheme = "light";
    window.localStorage.setItem(storageKey, "light");
  }, []);

  const setTheme = useCallback(() => undefined, []);
  const toggleTheme = useCallback(() => undefined, []);

  const value = useMemo(
    () => ({
      theme: "light" as const,
      toggleTheme,
      setTheme,
    }),
    [setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
