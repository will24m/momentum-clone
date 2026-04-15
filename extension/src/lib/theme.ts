import type { UserSettings } from "@shared/types";

type ResolvedTheme = "light" | "dark";

export function resolveThemePreference(theme: UserSettings["theme"]): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme;
}

export function applyTheme(settings: UserSettings) {
  if (typeof document === "undefined") {
    return;
  }

  const resolved = resolveThemePreference(settings.theme);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.accent = settings.accentTheme;
  root.style.colorScheme = resolved;
}

