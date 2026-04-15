import type { PersistedSnapshot } from "@shared/types";

const STORAGE_KEY = "momentum-todo-snapshot-v1";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function loadSnapshot() {
  if (hasChromeStorage()) {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return (data[STORAGE_KEY] as PersistedSnapshot | undefined) ?? null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as PersistedSnapshot) : null;
}

export async function saveSnapshot(snapshot: PersistedSnapshot) {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: snapshot });
    return;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }
}

export function subscribeToSnapshotChanges(listener: (snapshot: PersistedSnapshot) => void) {
  if (hasChromeStorage()) {
    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== "local") {
        return;
      }

      const change = changes[STORAGE_KEY];
      if (change?.newValue) {
        listener(change.newValue as PersistedSnapshot);
      }
    };

    chrome.storage.onChanged.addListener(handleChange);

    return () => chrome.storage.onChanged.removeListener(handleChange);
  }

  if (typeof window !== "undefined") {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        listener(JSON.parse(event.newValue) as PersistedSnapshot);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }

  return () => undefined;
}

