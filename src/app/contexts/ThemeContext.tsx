import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readWalletThemePreference, writeWalletThemePreference } from "@/utils/themePreferences";
import { USER_SETTINGS_SYNC_EVENT } from "@/utils/userSettingsUtils";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  applyThemeFromWallet: (address?: string | null) => Theme;
  activeWalletAddress: string | null;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
  applyThemeFromWallet: () => "dark",
  activeWalletAddress: null,
});

const cssVars: Record<Theme, Record<string, string>> = {
  dark: {
    "--t-page-bg": "#0a0a0a",
    "--t-nav-bg": "rgba(18,18,18,0.74)",
    "--t-nav-border": "rgba(255,255,255,0.1)",
    "--t-nav-pill-bg": "rgba(255,255,255,0.06)",
    "--t-nav-pill-border": "transparent",
    "--t-card-bg": "rgba(255,255,255,0.035)",
    "--t-card-border": "transparent",
    "--t-card-shadow": "none",
    "--t-surface-2": "rgba(255,255,255,0.02)",
    "--t-surface-5": "rgba(255,255,255,0.05)",
    "--t-surface-10": "rgba(255,255,255,0.1)",
    "--t-surface-hover": "rgba(255,255,255,0.06)",
    "--t-code-bg": "#121212",
    "--t-code-comment": "#2cc295",
    "--t-input-bg": "rgba(18,18,18,0.44)",
    "--t-input-focus-bg": "rgba(18,18,18,0.6)",
    "--t-dropdown-glass-bg": "rgba(14,14,16,0.62)",
    "--t-text-strong": "#ffffff",
    "--t-text-primary": "#f1f5f9",
    "--t-text-secondary": "#cbd5e1",
    "--t-text-muted": "#4A4A4A",
    "--t-border-subtle": "rgba(255,255,255,0.1)",
    "--t-border-medium": "rgba(255,255,255,0.14)",
    "--t-border-strong": "rgba(255,255,255,0.24)",
    "--t-sidebar-border": "rgba(255,255,255,0.06)",
    "--t-hero-gradient": "linear-gradient(180deg,rgba(44,194,149,0.1) 0%,transparent 100%)",
    "--t-hero-radial": "radial-gradient(circle at 50% 0%,rgba(44,194,149,0.13) 0%,transparent 60%)",
    "--t-hero-border": "rgba(255,255,255,0.06)",
    "--t-switch-bg": "rgba(0,0,0,0.4)",
    "--t-switch-knob": "#f1f5f9",
    "--t-state-row-bg": "rgba(255,255,255,0.02)",
    "--t-state-row-border": "rgba(255,255,255,0.08)",
    "--t-icon-fill": "#CBD5E1",
    "--t-chip-bg": "rgba(255,255,255,0.1)",
    "--t-chip-text": "#cbd5e1",
    "--t-cb-unchecked-bg": "#121212",
    "--t-cb-unchecked-bd": "rgba(255,255,255,0.15)",
    "--t-gradient-widget": "linear-gradient(149.9deg,rgba(44,194,149,0.18) 0%,rgba(59,130,246,0.08) 100%)",
    "--t-gradient-border": "rgba(44,194,149,0.2)",
    "--t-section-bg-alt": "rgba(255,255,255,0.02)",
  },
  light: {
    "--t-page-bg": "#eef1f4",
    "--t-nav-bg": "rgba(255,255,255,0.8)",
    "--t-nav-border": "rgba(0,0,0,0.07)",
    "--t-nav-pill-bg": "rgba(0,0,0,0.04)",
    "--t-nav-pill-border": "transparent",
    "--t-card-bg": "rgba(255,255,255,0.74)",
    "--t-card-border": "transparent",
    "--t-card-shadow": "none",
    "--t-surface-2": "rgba(0,0,0,0.02)",
    "--t-surface-5": "rgba(0,0,0,0.03)",
    "--t-surface-10": "rgba(0,0,0,0.05)",
    "--t-surface-hover": "rgba(0,0,0,0.03)",
    "--t-code-bg": "#f4f6f9",
    "--t-code-comment": "#1a9b74",
    "--t-input-bg": "rgba(255,255,255,0.68)",
    "--t-input-focus-bg": "rgba(255,255,255,0.82)",
    "--t-dropdown-glass-bg": "rgba(245,247,250,0.66)",
    "--t-text-strong": "#111111",
    "--t-text-primary": "#1e293b",
    "--t-text-secondary": "#475569",
    "--t-text-muted": "#94a3b8",
    "--t-border-subtle": "rgba(0,0,0,0.08)",
    "--t-border-medium": "rgba(0,0,0,0.1)",
    "--t-border-strong": "rgba(0,0,0,0.16)",
    "--t-sidebar-border": "rgba(0,0,0,0.06)",
    "--t-hero-gradient": "linear-gradient(180deg,rgba(44,194,149,0.06) 0%,transparent 100%)",
    "--t-hero-radial": "radial-gradient(circle at 50% 0%,rgba(44,194,149,0.08) 0%,transparent 55%)",
    "--t-hero-border": "rgba(0,0,0,0.04)",
    "--t-switch-bg": "rgba(44,194,149,0.15)",
    "--t-switch-knob": "#2cc295",
    "--t-state-row-bg": "#ffffff",
    "--t-state-row-border": "rgba(0,0,0,0.07)",
    "--t-icon-fill": "#4A4A4A",
    "--t-chip-bg": "rgba(0,0,0,0.055)",
    "--t-chip-text": "#475569",
    "--t-cb-unchecked-bg": "#f8fafc",
    "--t-cb-unchecked-bd": "rgba(0,0,0,0.18)",
    "--t-gradient-widget": "linear-gradient(149.9deg,rgba(44,194,149,0.1) 0%,rgba(59,130,246,0.05) 100%)",
    "--t-gradient-border": "rgba(44,194,149,0.22)",
    "--t-section-bg-alt": "rgba(0,0,0,0.02)",
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [activeWalletAddress, setActiveWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const vars = cssVars[theme];
    Object.entries(vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncThemeFromSettings = () => {
      if (!activeWalletAddress) return;
      const nextTheme = readWalletThemePreference(activeWalletAddress);
      setThemeState(nextTheme);
    };

    window.addEventListener(USER_SETTINGS_SYNC_EVENT, syncThemeFromSettings as EventListener);
    window.addEventListener("storage", syncThemeFromSettings as EventListener);
    return () => {
      window.removeEventListener(USER_SETTINGS_SYNC_EVENT, syncThemeFromSettings as EventListener);
      window.removeEventListener("storage", syncThemeFromSettings as EventListener);
    };
  }, [activeWalletAddress]);

  const persistWalletTheme = useCallback((nextTheme: Theme, walletAddress?: string | null) => {
    if (!walletAddress) return;
    writeWalletThemePreference(walletAddress, nextTheme);
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    persistWalletTheme(nextTheme, activeWalletAddress);
  }, [activeWalletAddress, persistWalletTheme]);

  const applyThemeFromWallet = useCallback((address?: string | null): Theme => {
    const normalizedAddress = address?.toLowerCase() ?? null;
    setActiveWalletAddress(normalizedAddress);

    const nextTheme = readWalletThemePreference(normalizedAddress);
    setThemeState(nextTheme);
    return nextTheme;
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      persistWalletTheme(nextTheme, activeWalletAddress);
      return nextTheme;
    });
  }, [activeWalletAddress, persistWalletTheme]);

  const contextValue = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      applyThemeFromWallet,
      activeWalletAddress,
    }),
    [theme, toggleTheme, setTheme, applyThemeFromWallet, activeWalletAddress],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
