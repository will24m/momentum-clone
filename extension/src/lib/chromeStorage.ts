import type { PersistedSnapshot } from "@shared/types";

const STORAGE_KEY_V2 = "momentum-kanban-snapshot-v2";
const STORAGE_KEY_V1 = "momentum-todo-snapshot-v1";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function loadSnapshot(): Promise<PersistedSnapshot | null> {
  if (hasChromeStorage()) {
    // Try V2 key first; fall back to V1 for migration
    const data = await chrome.storage.local.get([STORAGE_KEY_V2, STORAGE_KEY_V1]);
    if (data[STORAGE_KEY_V2]) {
      return data[STORAGE_KEY_V2] as PersistedSnapshot;
    }
    if (data[STORAGE_KEY_V1]) {
      return data[STORAGE_KEY_V1] as PersistedSnapshot;
    }
    return null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const v2 = window.localStorage.getItem(STORAGE_KEY_V2);
  if (v2) {
    return JSON.parse(v2) as PersistedSnapshot;
  }

  const v1 = window.localStorage.getItem(STORAGE_KEY_V1);
  return v1 ? (JSON.parse(v1) as PersistedSnapshot) : null;
}

export async function saveSnapshot(snapshot: PersistedSnapshot): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY_V2]: snapshot });
    // Delete old V1 key only after V2 is confirmed written
    try {
      await chrome.storage.local.remove(STORAGE_KEY_V1);
    } catch {
      // Non-fatal: V1 key may not exist
    }
    return;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(snapshot));
    window.localStorage.removeItem(STORAGE_KEY_V1);
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

      const change = changes[STORAGE_KEY_V2];
      if (change?.newValue) {
        listener(change.newValue as PersistedSnapshot);
      }
    };

    chrome.storage.onChanged.addListener(handleChange);

    return () => chrome.storage.onChanged.removeListener(handleChange);
  }

  if (typeof window !== "undefined") {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY_V2 && event.newValue) {
        listener(JSON.parse(event.newValue) as PersistedSnapshot);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }

  return () => undefined;
}
