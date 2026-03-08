export type WalletTheme = "dark" | "light";

const SETTINGS_KEY_PREFIX = "orina_user_settings_";
const DEFAULT_THEME: WalletTheme = "dark";

type WalletSettingsRecord = Record<string, unknown> & {
  darkMode?: boolean;
};

function normalizeAddress(address?: string | null): string | null {
  if (!address || typeof address !== "string") return null;
  const trimmed = address.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function parseSettings(raw: string | null): WalletSettingsRecord {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as WalletSettingsRecord;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Ignore malformed payloads and reset to defaults.
  }

  return {};
}

export function getWalletSettingsKey(address?: string | null): string | null {
  const normalized = normalizeAddress(address);
  if (!normalized) return null;
  return `${SETTINGS_KEY_PREFIX}${normalized}`;
}

export function readWalletThemePreference(address?: string | null): WalletTheme {
  if (typeof window === "undefined") return DEFAULT_THEME;

  const key = getWalletSettingsKey(address);
  if (!key) return DEFAULT_THEME;

  const settings = parseSettings(window.localStorage.getItem(key));
  if (typeof settings.darkMode === "boolean") {
    return settings.darkMode ? "dark" : "light";
  }

  return DEFAULT_THEME;
}

export function writeWalletThemePreference(
  address: string | null | undefined,
  theme: WalletTheme,
): void {
  if (typeof window === "undefined") return;

  const key = getWalletSettingsKey(address);
  if (!key) return;

  const existing = parseSettings(window.localStorage.getItem(key));
  const nextSettings: WalletSettingsRecord = {
    ...existing,
    darkMode: theme === "dark",
  };

  window.localStorage.setItem(key, JSON.stringify(nextSettings));
}
