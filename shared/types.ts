export type ThemePreference = "system" | "light" | "dark";
export type AppMode = "local" | "cloud";
export type SyncStatus = "local-only" | "synced" | "pending" | "error";
export type SyncHealth = "idle" | "syncing" | "offline" | "error";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskSize = "xs" | "sm" | "md" | "lg" | "xl";
export type ActiveView = "kanban" | "list" | "table" | "calendar" | "timeline";

export interface Board {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface Column {
  id: string;
  boardId: string;
  userId: string | null;
  name: string;
  color: string | null;
  order: number;
  wipLimit: number | null;
  isTerminal: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface Label {
  id: string;
  boardId: string;
  userId: string | null;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface SubtaskItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface TodoTask {
  id: string;
  userId: string | null;
  text: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  // V1 deprecated fields — kept for migration read only, will be null post-migration
  category: string | null;
  note: string | null;
  // V2 fields — all nullable for backward compat on read; populated after migration
  boardId: string | null;
  columnId: string | null;
  description: string | null;
  priority: TaskPriority | null;
  size: TaskSize | null;
  labelIds: string[];
  dueDate: string | null;
  startDate: string | null;
  assigneeId: string | null;
  subtasks: SubtaskItem[];
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
      updates: Partial<
        Pick<
          TodoTask,
          | "text"
          | "category"
          | "note"
          | "description"
          | "completed"
          | "order"
          | "deletedAt"
          | "updatedAt"
          | "columnId"
          | "boardId"
          | "priority"
          | "size"
          | "labelIds"
          | "dueDate"
          | "startDate"
          | "assigneeId"
          | "subtasks"
        >
      >;
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
      columnId: string | null;
      orderedTaskIds: string[];
      createdAt: string;
    }
  | {
      id: string;
      type: "settings";
      settings: UserSettings;
      createdAt: string;
    }
  | {
      id: string;
      type: "upsert-board";
      board: Board;
      createdAt: string;
    }
  | {
      id: string;
      type: "delete-board";
      boardId: string;
      deletedAt: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "upsert-column";
      column: Column;
      createdAt: string;
    }
  | {
      id: string;
      type: "delete-column";
      columnId: string;
      deletedAt: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "upsert-label";
      label: Label;
      createdAt: string;
    }
  | {
      id: string;
      type: "delete-label";
      labelId: string;
      deletedAt: string;
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
  boards: Board[];
  columns: Column[];
  labels: Label[];
  settings: UserSettings;
  mode: AppMode;
  sync: SyncState;
  auth: AuthState;
  welcomeDismissed: boolean;
  activeBoard: string | null;
  activeView: ActiveView;
  schemaVersion: number;
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
  boards: Board[];
  columns: Column[];
  labels: Label[];
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
