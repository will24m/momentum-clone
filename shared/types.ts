export type ThemePreference = "system" | "light" | "dark";
export type AppMode = "local" | "cloud";
export type SyncStatus = "local-only" | "synced" | "pending" | "error";
export type SyncHealth = "idle" | "syncing" | "offline" | "error";

export interface TodoTask {
  id: string;
  userId: string | null;
  text: string;
  category: string | null;
  note: string | null;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface UserSettings {
  theme: ThemePreference;
  completedSectionCollapsed: boolean;
  defaultMode: AppMode;
  accentTheme: "sunrise" | "paper" | "midnight";
  showCompletedByDefault: boolean;
}

export interface AuthProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string | null;
}

export interface AuthState {
  status: "unknown" | "signed-out" | "signed-in";
  profile: AuthProfile | null;
  magicLinkPendingEmail: string | null;
  lastError: string | null;
}

export type PendingMutation =
  | {
      id: string;
      type: "create";
      task: TodoTask;
      createdAt: string;
    }
  | {
      id: string;
      type: "update";
      taskId: string;
      updates: Partial<Pick<TodoTask, "text" | "category" | "note" | "completed" | "order" | "deletedAt" | "updatedAt">>;
      createdAt: string;
    }
  | {
      id: string;
      type: "delete";
      taskId: string;
      deletedAt: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "reorder";
      orderedTaskIds: string[];
      createdAt: string;
    }
  | {
      id: string;
      type: "settings";
      settings: UserSettings;
      createdAt: string;
    };

export interface SyncState {
  queue: PendingMutation[];
  lastSuccessfulSyncAt: string | null;
  lastAttemptedSyncAt: string | null;
  health: SyncHealth;
  lastError: string | null;
}

export interface PersistedSnapshot {
  tasks: TodoTask[];
  settings: UserSettings;
  mode: AppMode;
  sync: SyncState;
  auth: AuthState;
  welcomeDismissed: boolean;
}

export interface ImportDecisionState {
  localTasks: TodoTask[];
  remoteTasks: TodoTask[];
}

export interface AppStats {
  activeCount: number;
  completedCount: number;
  completionRate: number;
}

export interface RemoteSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

export interface RemoteBootstrapResult {
  profile: AuthProfile | null;
  tasks: TodoTask[];
  settings: Partial<UserSettings> | null;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  completedSectionCollapsed: true,
  defaultMode: "local",
  accentTheme: "sunrise",
  showCompletedByDefault: false,
};

export const DEFAULT_AUTH_STATE: AuthState = {
  status: "signed-out",
  profile: null,
  magicLinkPendingEmail: null,
  lastError: null,
};

export const DEFAULT_SYNC_STATE: SyncState = {
  queue: [],
  lastSuccessfulSyncAt: null,
  lastAttemptedSyncAt: null,
  health: "idle",
  lastError: null,
};
