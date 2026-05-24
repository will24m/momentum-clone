import { create } from "zustand";
import type {
  ActiveView,
  AppMode,
  Board,
  Column,
  ImportDecisionState,
  Label,
  PendingMutation,
  PersistedSnapshot,
  SubtaskItem,
  TaskPriority,
  TaskSize,
  TodoTask,
  UserSettings,
} from "@shared/types";
import { DEFAULT_AUTH_STATE, DEFAULT_SETTINGS, DEFAULT_SYNC_STATE } from "@shared/types";
import { loadSnapshot, saveSnapshot } from "@/lib/chromeStorage";
import { needsMigration, migrateSnapshotToV2 } from "@/lib/migration";
import {
  fetchRemoteBootstrap,
  getRemoteProfile,
  requestMagicCode,
  saveRemoteSettings,
  signOutRemote,
  softDeleteRemoteTask,
  upsertRemoteTask,
  upsertRemoteTasks,
  updateRemoteProfileName,
  verifyMagicCode as verifyRemoteMagicCode,
  upsertRemoteBoard,
  softDeleteRemoteBoard,
  upsertRemoteColumn,
  softDeleteRemoteColumn,
  upsertRemoteLabel,
  softDeleteRemoteLabel,
} from "@/lib/remote";
import { hasRemoteConfig } from "@/lib/supabase";
import { applyTheme } from "@/lib/theme";
import {
  buildTask,
  cleanTaskCategory,
  cleanTaskNote,
  computeNextOrder,
  createId,
  markTaskStatus,
  mergeTasksForImport,
  nowIso,
  partitionTasks,
  resequenceTasks,
  splitTaskInput,
  tasksFingerprint,
} from "@/lib/utils";

type TaskDraftInput = {
  text: string;
  category?: string | null;
  note?: string | null;
  description?: string | null;
  priority?: TaskPriority | null;
  size?: TaskSize | null;
  dueDate?: string | null;
  startDate?: string | null;
  labelIds?: string[];
  subtasks?: SubtaskItem[];
};

type ToastAction =
  | {
      kind: "restore-tasks";
      tasks: TodoTask[];
    }
  | {
      kind: "none";
    };

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: "default" | "error";
  actionLabel?: string;
  action: ToastAction;
}

type AppStore = PersistedSnapshot & {
  hydrated: boolean;
  initializing: boolean;
  remoteConfigured: boolean;
  online: boolean;
  isFlushingQueue: boolean;
  showSettings: boolean;
  showAuthDialog: boolean;
  showBoardSettings: boolean;
  importDecision: ImportDecisionState | null;
  toasts: ToastItem[];
  composerFocusNonce: number;
  selectedTaskIds: string[];
  initialize: () => Promise<void>;
  setOnline: (online: boolean) => void;
  focusComposer: () => void;
  dismissToast: (toastId: string) => void;
  triggerToastAction: (toastId: string) => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  openBoardSettings: () => void;
  closeBoardSettings: () => void;
  toggleTaskSelection: (taskId: string) => void;
  clearSelection: () => void;
  selectAll: (taskIds: string[]) => void;
  bulkMoveToColumn: (targetColumnId: string) => Promise<void>;
  bulkDeleteTasks: () => Promise<void>;
  bulkSetPriority: (priority: TaskPriority | null) => Promise<void>;
  resetAuthFlow: () => void;
  dismissWelcome: (mode: AppMode) => Promise<void>;
  sendMagicCode: (email: string) => Promise<void>;
  verifyMagicCode: (email: string, token: string) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchMode: (mode: AppMode) => Promise<void>;
  setActiveBoard: (boardId: string) => void;
  setActiveView: (view: ActiveView) => void;
  addTasksFromInput: (input: TaskDraftInput) => Promise<void>;
  updateTaskText: (taskId: string, text: string) => Promise<void>;
  updateTaskDetails: (taskId: string, input: TaskDraftInput) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  restoreTasks: (tasks: TodoTask[]) => Promise<void>;
  reorderActiveTasks: (orderedTaskIds: string[]) => Promise<void>;
  reorderTasksInColumn: (columnId: string, orderedTaskIds: string[]) => Promise<void>;
  moveTaskToColumn: (taskId: string, targetColumnId: string, targetOrder: number) => Promise<void>;
  clearCompleted: () => Promise<void>;
  toggleCompletedSection: () => Promise<void>;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  // Board CRUD
  createBoard: (name: string) => Promise<void>;
  updateBoard: (boardId: string, updates: Partial<Pick<Board, "name" | "description">>) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  // Column CRUD
  createColumn: (boardId: string, name: string, options?: { color?: string; wipLimit?: number }) => Promise<void>;
  updateColumn: (columnId: string, updates: Partial<Pick<Column, "name" | "color" | "wipLimit" | "isTerminal" | "order">>) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (boardId: string, orderedColumnIds: string[]) => Promise<void>;
  // Label CRUD
  createLabel: (boardId: string, name: string, color: string) => Promise<void>;
  updateLabel: (labelId: string, updates: Partial<Pick<Label, "name" | "color">>) => Promise<void>;
  deleteLabel: (labelId: string) => Promise<void>;
  flushQueue: () => Promise<void>;
  refreshRemoteState: () => Promise<void>;
  resolveImportDecision: (strategy: "merge" | "cloud") => Promise<void>;
};

const initialSnapshot: PersistedSnapshot = {
  tasks: [],
  boards: [],
  columns: [],
  labels: [],
  settings: DEFAULT_SETTINGS,
  mode: "local",
  sync: DEFAULT_SYNC_STATE,
  auth: {
    ...DEFAULT_AUTH_STATE,
    status: "unknown",
  },
  welcomeDismissed: false,
  activeBoard: null,
  activeView: "kanban",
  schemaVersion: 1,
};

function normalizeTaskRecord(task: TodoTask): TodoTask {
  return {
    ...task,
    category: cleanTaskCategory(task.category),
    note: cleanTaskNote(task.note),
    labelIds: task.labelIds ?? [],
    subtasks: task.subtasks ?? [],
    boardId: task.boardId ?? null,
    columnId: task.columnId ?? null,
    description: task.description ?? null,
    priority: task.priority ?? null,
    size: task.size ?? null,
    dueDate: task.dueDate ?? null,
    startDate: task.startDate ?? null,
    assigneeId: task.assigneeId ?? null,
  };
}

function normalizeSnapshotRecord(snapshot: PersistedSnapshot): PersistedSnapshot {
  return {
    tasks: snapshot.tasks.map(normalizeTaskRecord),
    boards: snapshot.boards ?? [],
    columns: snapshot.columns ?? [],
    labels: snapshot.labels ?? [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...snapshot.settings,
    },
    mode: snapshot.mode,
    sync: {
      ...DEFAULT_SYNC_STATE,
      ...snapshot.sync,
      queue: snapshot.sync?.queue ?? [],
    },
    auth: {
      ...DEFAULT_AUTH_STATE,
      ...snapshot.auth,
    },
    welcomeDismissed: snapshot.welcomeDismissed ?? false,
    activeBoard: snapshot.activeBoard ?? null,
    activeView: snapshot.activeView ?? "kanban",
    schemaVersion: snapshot.schemaVersion ?? 1,
  };
}

function isCloudSyncActive(state: Pick<AppStore, "mode" | "remoteConfigured" | "online" | "auth">) {
  return (
    state.mode === "cloud" &&
    state.remoteConfigured &&
    state.online &&
    state.auth.status === "signed-in" &&
    Boolean(state.auth.profile)
  );
}

function buildPersistedSnapshot(state: AppStore): PersistedSnapshot {
  return {
    tasks: state.tasks,
    boards: state.boards,
    columns: state.columns,
    labels: state.labels,
    settings: state.settings,
    mode: state.mode,
    sync: state.sync,
    auth: state.auth,
    welcomeDismissed: state.welcomeDismissed,
    activeBoard: state.activeBoard,
    activeView: state.activeView,
    schemaVersion: state.schemaVersion,
  };
}

function compactQueue(queue: PendingMutation[]) {
  const latestSettings = [...queue].reverse().find((entry) => entry.type === "settings");

  return queue.filter((entry) => {
    if (entry.type === "settings") {
      return latestSettings?.id === entry.id;
    }
    // Keep all reorder mutations (now per-column, no compaction needed)
    return true;
  });
}

export const useAppStore = create<AppStore>((set, get) => {
  const persistCurrentState = async () => {
    await saveSnapshot(buildPersistedSnapshot(get()));
  };

  const pushToast = (toast: Omit<ToastItem, "id">) => {
    const nextToast: ToastItem = {
      id: createId("toast_"),
      ...toast,
    };

    set((state) => ({
      toasts: [nextToast, ...state.toasts].slice(0, 4),
    }));
  };

  const enqueueMutations = async (mutations: PendingMutation[]) => {
    if (!mutations.length) {
      await persistCurrentState();
      return;
    }

    set((state) => ({
      sync: {
        ...state.sync,
        queue: compactQueue([...state.sync.queue, ...mutations]),
        health: state.online ? "syncing" : "offline",
        lastError: null,
      },
    }));

    await persistCurrentState();

    if (isCloudSyncActive(get())) {
      void get().flushQueue();
    }
  };

  const queueTaskUpsert = async (tasks: TodoTask[]) => {
    await enqueueMutations(
      tasks.map((task) => ({
        id: createId("mutation_"),
        type: "create" as const,
        task,
        createdAt: nowIso(),
      })),
    );
  };

  const hydrateFromRemote = async (reason: "startup" | "signin" | "switch") => {
    const state = get();
    if (!state.remoteConfigured || state.auth.status !== "signed-in") {
      return;
    }

    const remote = await fetchRemoteBootstrap();
    const localTasks = state.tasks;
    const remoteTasks = remote.tasks;
    const mergedSettings = {
      ...state.settings,
      ...(remote.settings ?? {}),
    };

    applyTheme(mergedSettings);

    if (reason === "startup") {
      set((current) => ({
        settings: mergedSettings,
        boards: remote.boards.length > 0 ? remote.boards : current.boards,
        columns: remote.columns.length > 0 ? remote.columns : current.columns,
        labels: remote.labels.length > 0 ? remote.labels : current.labels,
        auth: {
          ...current.auth,
          profile: remote.profile,
          status: remote.profile ? "signed-in" : "signed-out",
          lastError: null,
        },
        tasks:
          current.sync.queue.length > 0
            ? current.tasks
            : remoteTasks.map((task) => ({ ...task, syncStatus: "synced" as const })),
      }));
      await persistCurrentState();
      return;
    }

    if (localTasks.length && remoteTasks.length && tasksFingerprint(localTasks) !== tasksFingerprint(remoteTasks)) {
      set({
        settings: mergedSettings,
        importDecision: {
          localTasks,
          remoteTasks,
        },
      });
      await persistCurrentState();
      return;
    }

    if (localTasks.length && !remoteTasks.length) {
      const ownedLocalTasks = resequenceTasks(
        localTasks.map((task) => ({
          ...task,
          userId: remote.profile?.id ?? state.auth.profile?.id ?? null,
          syncStatus: "pending" as const,
        })),
      );

      set({
        mode: "cloud",
        settings: mergedSettings,
        tasks: ownedLocalTasks,
        boards: remote.boards.length > 0 ? remote.boards : state.boards,
        columns: remote.columns.length > 0 ? remote.columns : state.columns,
        labels: remote.labels.length > 0 ? remote.labels : state.labels,
      });
      await queueTaskUpsert(ownedLocalTasks);
      await enqueueMutations([
        {
          id: createId("mutation_"),
          type: "settings",
          settings: mergedSettings,
          createdAt: nowIso(),
        },
      ]);
      return;
    }

    set({
      mode: "cloud",
      settings: mergedSettings,
      boards: remote.boards.length > 0 ? remote.boards : state.boards,
      columns: remote.columns.length > 0 ? remote.columns : state.columns,
      labels: remote.labels.length > 0 ? remote.labels : state.labels,
      tasks: remoteTasks.map((task) => ({ ...task, syncStatus: "synced" as const })),
      importDecision: null,
    });
    await persistCurrentState();
  };

  return {
    ...initialSnapshot,
    hydrated: false,
    initializing: false,
    remoteConfigured: hasRemoteConfig(),
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    isFlushingQueue: false,
    showSettings: false,
    showAuthDialog: false,
    showBoardSettings: false,
    importDecision: null,
    toasts: [],
    composerFocusNonce: 0,
    selectedTaskIds: [],
    async initialize() {
      if (get().initializing) {
        return;
      }

      set({
        initializing: true,
        remoteConfigured: hasRemoteConfig(),
      });

      const rawSnapshot = await loadSnapshot();
      let snapshot = normalizeSnapshotRecord(rawSnapshot ?? initialSnapshot);

      // Run V1→V2 migration if needed
      if (needsMigration(snapshot)) {
        const userId = snapshot.auth?.profile?.id ?? null;
        snapshot = migrateSnapshotToV2(snapshot, userId);
        await saveSnapshot(snapshot);
      }

      applyTheme(snapshot.settings);

      // Set activeBoard to first board if not already set
      const activeBoardId =
        snapshot.activeBoard ?? snapshot.boards[0]?.id ?? null;

      set({
        ...snapshot,
        activeBoard: activeBoardId,
        hydrated: true,
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
      });

      if (!hasRemoteConfig()) {
        set((state) => ({
          auth: {
            ...state.auth,
            status: "signed-out",
          },
          initializing: false,
        }));
        await persistCurrentState();
        return;
      }

      try {
        const profile = await getRemoteProfile();

        set((state) => ({
          auth: profile
            ? {
                status: "signed-in",
                profile,
                magicLinkPendingEmail: null,
                lastError: null,
              }
            : {
                ...state.auth,
                status: "signed-out",
                profile: null,
                lastError: null,
              },
        }));

        if (profile && get().mode === "cloud") {
          await hydrateFromRemote("startup");
          if (get().sync.queue.length > 0) {
            await get().flushQueue();
          }
        }
      } catch (error) {
        set((state) => ({
          auth: {
            ...state.auth,
            status: "signed-out",
            profile: null,
            lastError: error instanceof Error ? error.message : "Authentication could not be restored.",
          },
        }));
      } finally {
        set({ initializing: false });
        await persistCurrentState();
      }
    },
    setOnline(online) {
      set((state) => ({
        online,
        sync: {
          ...state.sync,
          health: online ? (state.sync.queue.length > 0 ? "syncing" : "idle") : "offline",
        },
      }));

      if (online && isCloudSyncActive(get()) && get().sync.queue.length > 0) {
        void get().flushQueue();
      }
    },
    focusComposer() {
      set((state) => ({
        composerFocusNonce: state.composerFocusNonce + 1,
      }));
    },
    dismissToast(toastId) {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== toastId),
      }));
    },
    async triggerToastAction(toastId) {
      const toast = get().toasts.find((candidate) => candidate.id === toastId);
      if (!toast) {
        return;
      }

      if (toast.action.kind === "restore-tasks") {
        await get().restoreTasks(toast.action.tasks);
      }

      get().dismissToast(toastId);
    },
    openSettings() {
      set({ showSettings: true });
    },
    closeSettings() {
      set({ showSettings: false });
    },
    openAuthDialog() {
      set({ showAuthDialog: true });
    },
    closeAuthDialog() {
      set({ showAuthDialog: false });
    },
    openBoardSettings() {
      set({ showBoardSettings: true });
    },
    closeBoardSettings() {
      set({ showBoardSettings: false });
    },
    toggleTaskSelection(taskId) {
      set((state) => ({
        selectedTaskIds: state.selectedTaskIds.includes(taskId)
          ? state.selectedTaskIds.filter((id) => id !== taskId)
          : [...state.selectedTaskIds, taskId],
      }));
    },
    clearSelection() {
      set({ selectedTaskIds: [] });
    },
    selectAll(taskIds) {
      set({ selectedTaskIds: taskIds });
    },
    async bulkMoveToColumn(targetColumnId) {
      const state = get();
      const selectedIds = new Set(state.selectedTaskIds);
      if (!selectedIds.size) return;
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const targetColumn = state.columns.find((c) => c.id === targetColumnId);
      const isTerminal = targetColumn?.isTerminal ?? false;
      const now = nowIso();
      const affected = state.tasks.filter((t) => selectedIds.has(t.id));
      const nextTasks = state.tasks.map((task) =>
        selectedIds.has(task.id)
          ? { ...task, columnId: targetColumnId, completed: isTerminal, updatedAt: now, syncStatus: shouldSync ? ("pending" as const) : ("local-only" as const) }
          : task,
      );
      set({ tasks: nextTasks, selectedTaskIds: [] });
      if (shouldSync) {
        await enqueueMutations(
          affected.map((t) => ({
            id: createId("mutation_"),
            type: "update" as const,
            taskId: t.id,
            updates: { columnId: targetColumnId, completed: isTerminal, updatedAt: now },
            createdAt: now,
          })),
        );
      } else {
        await persistCurrentState();
      }
    },
    async bulkDeleteTasks() {
      const state = get();
      const selectedIds = new Set(state.selectedTaskIds);
      if (!selectedIds.size) return;
      const deletedAt = nowIso();
      const deletedTasks = state.tasks.filter((t) => selectedIds.has(t.id));
      set({ tasks: state.tasks.filter((t) => !selectedIds.has(t.id)), selectedTaskIds: [] });
      pushToast({
        title: `${deletedTasks.length} task${deletedTasks.length === 1 ? "" : "s"} deleted`,
        description: "Undo is available for a moment.",
        actionLabel: "Undo",
        action: { kind: "restore-tasks", tasks: deletedTasks },
      });
      if (state.mode === "cloud" && state.auth.status === "signed-in") {
        await enqueueMutations(
          deletedTasks.map((t) => ({
            id: createId("mutation_"),
            type: "delete" as const,
            taskId: t.id,
            deletedAt,
            createdAt: deletedAt,
          })),
        );
      } else {
        await persistCurrentState();
      }
    },
    async bulkSetPriority(priority) {
      const state = get();
      const selectedIds = new Set(state.selectedTaskIds);
      if (!selectedIds.size) return;
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const now = nowIso();
      const affected = state.tasks.filter((t) => selectedIds.has(t.id));
      const nextTasks = state.tasks.map((task) =>
        selectedIds.has(task.id)
          ? { ...task, priority, updatedAt: now, syncStatus: shouldSync ? ("pending" as const) : ("local-only" as const) }
          : task,
      );
      set({ tasks: nextTasks, selectedTaskIds: [] });
      if (shouldSync) {
        await enqueueMutations(
          affected.map((t) => ({
            id: createId("mutation_"),
            type: "update" as const,
            taskId: t.id,
            updates: { priority, updatedAt: now },
            createdAt: now,
          })),
        );
      } else {
        await persistCurrentState();
      }
    },
    resetAuthFlow() {
      set((state) => ({
        auth: {
          ...state.auth,
          magicLinkPendingEmail: null,
          lastError: null,
        },
      }));
    },
    async dismissWelcome(mode) {
      set({
        welcomeDismissed: true,
        mode,
      });
      await persistCurrentState();

      if (mode === "cloud") {
        set({ showAuthDialog: true });
      }
    },
    async sendMagicCode(email) {
      try {
        await requestMagicCode(email.trim());
        set((state) => ({
          auth: {
            ...state.auth,
            status: "signed-out",
            magicLinkPendingEmail: email.trim(),
            lastError: null,
          },
        }));
        pushToast({
          title: "Code sent",
          description: "Check your inbox, then come back here and paste the verification code.",
          action: { kind: "none" },
        });
      } catch (error) {
        set((state) => ({
          auth: {
            ...state.auth,
            lastError: error instanceof Error ? error.message : "We could not send the verification code.",
          },
        }));
      } finally {
        await persistCurrentState();
      }
    },
    async verifyMagicCode(email, token) {
      try {
        const profile = await verifyRemoteMagicCode(email.trim(), token.trim());
        set({
          auth: {
            status: "signed-in",
            profile,
            magicLinkPendingEmail: null,
            lastError: null,
          },
          showAuthDialog: false,
          mode: "cloud",
        });
        await hydrateFromRemote("signin");
        pushToast({
          title: "Sync is on",
          description: "This workspace can now follow you across devices.",
          action: { kind: "none" },
        });
      } catch (error) {
        set((state) => ({
          auth: {
            ...state.auth,
            lastError: error instanceof Error ? error.message : "That code did not work.",
          },
        }));
      } finally {
        await persistCurrentState();
      }
    },
    async updateProfileName(name) {
      const state = get();
      if (!state.remoteConfigured || state.auth.status !== "signed-in" || !state.auth.profile) {
        throw new Error("Sign in before changing your name.");
      }

      try {
        const profile = await updateRemoteProfileName(name);
        set((snapshot) => ({
          auth: {
            ...snapshot.auth,
            profile,
            lastError: null,
          },
        }));
        pushToast({
          title: "Name updated",
          description: "Your display name was saved.",
          action: { kind: "none" },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "We could not update your name.";
        set((snapshot) => ({
          auth: {
            ...snapshot.auth,
            lastError: message,
          },
        }));
        await persistCurrentState();
        throw error instanceof Error ? error : new Error(message);
      }

      await persistCurrentState();
    },
    async signOut() {
      try {
        await signOutRemote();
      } catch (error) {
        pushToast({
          title: "Sign-out issue",
          description: error instanceof Error ? error.message : "We could not sign you out cleanly.",
          tone: "error",
          action: { kind: "none" },
        });
      }

      set((state) => ({
        auth: {
          ...DEFAULT_AUTH_STATE,
          status: "signed-out",
        },
        mode: "local",
        sync: {
          ...DEFAULT_SYNC_STATE,
          health: state.online ? "idle" : "offline",
        },
        tasks: state.tasks.map((task) => ({
          ...task,
          userId: null,
          syncStatus: "local-only" as const,
        })),
        boards: state.boards.map((b) => ({ ...b, userId: null, syncStatus: "local-only" as const })),
        columns: state.columns.map((c) => ({ ...c, userId: null, syncStatus: "local-only" as const })),
        labels: state.labels.map((l) => ({ ...l, userId: null, syncStatus: "local-only" as const })),
      }));
      await persistCurrentState();
    },
    async switchMode(mode) {
      if (mode === get().mode) {
        return;
      }

      if (mode === "local") {
        set((state) => ({
          mode: "local",
          sync: {
            ...DEFAULT_SYNC_STATE,
            health: state.online ? "idle" : "offline",
          },
          tasks: state.tasks.map((task) => ({
            ...task,
            userId: null,
            syncStatus: "local-only" as const,
          })),
        }));
        await persistCurrentState();
        return;
      }

      if (get().auth.status !== "signed-in") {
        set({ showAuthDialog: true });
        return;
      }

      set({ mode: "cloud" });
      await hydrateFromRemote("switch");
      await persistCurrentState();
    },
    setActiveBoard(boardId) {
      set({ activeBoard: boardId });
      void persistCurrentState();
    },
    setActiveView(view) {
      set({ activeView: view });
      void persistCurrentState();
    },
    async addTasksFromInput(input) {
      const entries = splitTaskInput(input.text);

      if (!entries.length) {
        return;
      }

      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const userId = shouldSync ? state.auth.profile?.id ?? null : null;

      // Use the active board's first non-terminal column, or first column
      const activeBoardId = state.activeBoard ?? state.boards[0]?.id ?? null;
      const boardColumns = state.columns
        .filter((c) => c.boardId === activeBoardId && !c.deletedAt)
        .sort((a, b) => a.order - b.order);
      const defaultColumn = boardColumns.find((c) => !c.isTerminal) ?? boardColumns[0] ?? null;

      let nextTasks = [...state.tasks];

      const createdTasks = entries.map((entry, index) =>
        buildTask(entry, {
          userId,
          status: shouldSync ? "pending" : "local-only",
          order: computeNextOrder(nextTasks, false) + index * 1000,
          category: input.category,
          note: input.note,
          boardId: activeBoardId,
          columnId: defaultColumn?.id ?? null,
        }),
      );

      nextTasks = resequenceTasks([...state.tasks, ...createdTasks]);

      set({
        tasks: nextTasks,
        welcomeDismissed: true,
      });

      if (shouldSync) {
        await queueTaskUpsert(createdTasks);
      } else {
        await persistCurrentState();
      }
    },
    async updateTaskText(taskId, text) {
      await get().updateTaskDetails(taskId, { text });
    },
    async updateTaskDetails(taskId, input) {
      const trimmed = input.text.trim();
      if (!trimmed) {
        await get().deleteTask(taskId);
        return;
      }

      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const updatedAt = nowIso();
      const category = cleanTaskCategory(input.category);
      const note = cleanTaskNote(input.note);

      const patch: Partial<TodoTask> = {
        text: trimmed,
        category,
        note,
        updatedAt,
        syncStatus: shouldSync ? "pending" : "local-only",
      };
      if (input.description !== undefined) patch.description = input.description;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.size !== undefined) patch.size = input.size;
      if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
      if (input.startDate !== undefined) patch.startDate = input.startDate;
      if (input.labelIds !== undefined) patch.labelIds = input.labelIds;
      if (input.subtasks !== undefined) patch.subtasks = input.subtasks;

      const nextTasks = state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task,
      );

      set({ tasks: nextTasks });

      if (shouldSync) {
        const { syncStatus, ...mutationUpdates } = patch;
        void syncStatus;
        await enqueueMutations([
          {
            id: createId("mutation_"),
            type: "update",
            taskId,
            updates: mutationUpdates,
            createdAt: updatedAt,
          },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async toggleTask(taskId) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const updatedAt = nowIso();
      const target = state.tasks.find((task) => task.id === taskId);
      if (!target) {
        return;
      }

      const nextCompletedState = !target.completed;

      // Move to terminal/non-terminal column when toggling
      const activeBoardId = target.boardId ?? state.activeBoard ?? state.boards[0]?.id ?? null;
      const boardColumns = state.columns
        .filter((c) => c.boardId === activeBoardId && !c.deletedAt)
        .sort((a, b) => a.order - b.order);

      let targetColumnId = target.columnId;
      if (nextCompletedState) {
        const terminalCol = boardColumns.find((c) => c.isTerminal);
        if (terminalCol) targetColumnId = terminalCol.id;
      } else {
        const activeCol = boardColumns.find((c) => !c.isTerminal);
        if (activeCol) targetColumnId = activeCol.id;
      }

      const nextOrder = computeNextOrder(
        state.tasks.filter((task) => task.id !== taskId),
        nextCompletedState,
      );
      const nextTasks = resequenceTasks(
        state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completed: nextCompletedState,
                columnId: targetColumnId,
                order: nextOrder,
                updatedAt,
                syncStatus: shouldSync ? ("pending" as const) : ("local-only" as const),
              }
            : task,
        ),
      );

      set({
        tasks: nextTasks,
        settings: {
          ...state.settings,
          completedSectionCollapsed: nextCompletedState ? false : state.settings.completedSectionCollapsed,
        },
      });

      if (shouldSync) {
        await enqueueMutations([
          {
            id: createId("mutation_"),
            type: "update",
            taskId,
            updates: {
              completed: nextCompletedState,
              columnId: targetColumnId,
              order: nextOrder,
              updatedAt,
            },
            createdAt: updatedAt,
          },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async deleteTask(taskId) {
      const state = get();
      const target = state.tasks.find((task) => task.id === taskId);
      if (!target) {
        return;
      }

      const deletedAt = nowIso();
      set({
        tasks: state.tasks.filter((task) => task.id !== taskId),
      });

      pushToast({
        title: "Task deleted",
        description: "Undo is available for a moment.",
        actionLabel: "Undo",
        action: {
          kind: "restore-tasks",
          tasks: [target],
        },
      });

      if (state.mode === "cloud" && state.auth.status === "signed-in") {
        await enqueueMutations([
          {
            id: createId("mutation_"),
            type: "delete",
            taskId,
            deletedAt,
            createdAt: deletedAt,
          },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async restoreTasks(tasks) {
      const state = get();
      const existingIds = new Set(state.tasks.map((task) => task.id));
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const restored = tasks
        .filter((task) => !existingIds.has(task.id))
        .map((task) => ({
          ...task,
          userId: shouldSync ? state.auth.profile?.id ?? task.userId : null,
          syncStatus: shouldSync ? ("pending" as const) : ("local-only" as const),
          deletedAt: null,
          updatedAt: nowIso(),
        }));

      if (!restored.length) {
        return;
      }

      set((current) => ({
        tasks: resequenceTasks([...current.tasks, ...restored]),
        sync: {
          ...current.sync,
          queue: current.sync.queue.filter(
            (mutation) =>
              mutation.type !== "delete" || !restored.some((task) => task.id === mutation.taskId),
          ),
        },
      }));

      if (shouldSync) {
        await queueTaskUpsert(restored);
      } else {
        await persistCurrentState();
      }
    },
    async reorderActiveTasks(orderedTaskIds) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const { completed } = partitionTasks(state.tasks);
      const activeById = new Map(state.tasks.filter((task) => !task.completed).map((task) => [task.id, task]));
      const reorderedActive = orderedTaskIds
        .map((taskId, index) => {
          const task = activeById.get(taskId);
          if (!task) {
            return null;
          }

          return {
            ...task,
            order: (index + 1) * 1000,
            updatedAt: nowIso(),
            syncStatus: shouldSync ? ("pending" as const) : ("local-only" as const),
          };
        })
        .filter(Boolean) as TodoTask[];

      const nextTasks = resequenceTasks([...reorderedActive, ...completed]);
      set({ tasks: nextTasks });

      if (shouldSync) {
        await enqueueMutations([
          {
            id: createId("mutation_"),
            type: "reorder",
            columnId: null,
            orderedTaskIds,
            createdAt: nowIso(),
          },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async reorderTasksInColumn(columnId, orderedTaskIds) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const idSet = new Set(orderedTaskIds);
      const otherTasks = state.tasks.filter((t) => !idSet.has(t.id));
      const colTaskById = new Map(
        state.tasks.filter((t) => idSet.has(t.id)).map((t) => [t.id, t]),
      );

      const reordered = orderedTaskIds.map((taskId, index) => {
        const task = colTaskById.get(taskId);
        if (!task) return null;
        return {
          ...task,
          order: (index + 1) * 1000,
          updatedAt: nowIso(),
          syncStatus: shouldSync ? ("pending" as const) : ("local-only" as const),
        };
      }).filter(Boolean) as TodoTask[];

      set({ tasks: [...otherTasks, ...reordered] });

      if (shouldSync) {
        await enqueueMutations([
          {
            id: createId("mutation_"),
            type: "reorder",
            columnId,
            orderedTaskIds,
            createdAt: nowIso(),
          },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async moveTaskToColumn(taskId, targetColumnId, targetOrder) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const target = state.tasks.find((t) => t.id === taskId);
      if (!target) return;

      const targetColumn = state.columns.find((c) => c.id === targetColumnId);
      const isTerminal = targetColumn?.isTerminal ?? false;
      const updatedAt = nowIso();

      const nextTasks = state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              columnId: targetColumnId,
              completed: isTerminal,
              order: targetOrder,
              updatedAt,
              syncStatus: shouldSync ? ("pending" as const) : ("local-only" as const),
            }
          : task,
      );

      set({ tasks: nextTasks });

      if (shouldSync) {
        await enqueueMutations([
          {
            id: createId("mutation_"),
            type: "update",
            taskId,
            updates: {
              columnId: targetColumnId,
              completed: isTerminal,
              order: targetOrder,
              updatedAt,
            },
            createdAt: updatedAt,
          },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async clearCompleted() {
      const state = get();
      const completedTasks = state.tasks.filter((task) => task.completed);
      if (!completedTasks.length) {
        return;
      }

      const deletedAt = nowIso();
      set({
        tasks: state.tasks.filter((task) => !task.completed),
      });

      pushToast({
        title: "Completed tasks cleared",
        description: "Undo is available for a moment.",
        actionLabel: "Undo",
        action: {
          kind: "restore-tasks",
          tasks: completedTasks,
        },
      });

      if (state.mode === "cloud" && state.auth.status === "signed-in") {
        await enqueueMutations(
          completedTasks.map((task) => ({
            id: createId("mutation_"),
            type: "delete" as const,
            taskId: task.id,
            deletedAt,
            createdAt: deletedAt,
          })),
        );
      } else {
        await persistCurrentState();
      }
    },
    async toggleCompletedSection() {
      set((state) => ({
        settings: {
          ...state.settings,
          completedSectionCollapsed: !state.settings.completedSectionCollapsed,
        },
      }));
      applyTheme(get().settings);
      await persistCurrentState();
    },
    async updateSettings(partial) {
      const nextSettings = {
        ...get().settings,
        ...partial,
      };

      applyTheme(nextSettings);

      set({
        settings: nextSettings,
      });

      if (get().mode === "cloud" && get().auth.status === "signed-in") {
        await enqueueMutations([
          {
            id: createId("mutation_"),
            type: "settings",
            settings: nextSettings,
            createdAt: nowIso(),
          },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    // ---- Board CRUD ----
    async createBoard(name) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const userId = shouldSync ? state.auth.profile?.id ?? null : null;
      const now = nowIso();

      const boardId = createId("board_");
      const board: Board = {
        id: boardId,
        userId,
        name: name.trim().slice(0, 80),
        description: null,
        order: (Math.max(0, ...state.boards.map((b) => b.order)) + 1000),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: shouldSync ? "pending" : "local-only",
      };

      // Default columns for new board
      const colTodoId = createId("col_");
      const colDoneId = createId("col_");
      const defaultColumns: Column[] = [
        {
          id: colTodoId,
          boardId,
          userId,
          name: "To Do",
          color: "#94a3b8",
          order: 1000,
          wipLimit: null,
          isTerminal: false,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          syncStatus: shouldSync ? "pending" : "local-only",
        },
        {
          id: colDoneId,
          boardId,
          userId,
          name: "Done",
          color: "#4ade80",
          order: 2000,
          wipLimit: null,
          isTerminal: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          syncStatus: shouldSync ? "pending" : "local-only",
        },
      ];

      set((s) => ({
        boards: [...s.boards, board],
        columns: [...s.columns, ...defaultColumns],
        activeBoard: boardId,
      }));

      if (shouldSync) {
        await enqueueMutations([
          { id: createId("mutation_"), type: "upsert-board", board, createdAt: now },
          ...defaultColumns.map((col) => ({
            id: createId("mutation_"),
            type: "upsert-column" as const,
            column: col,
            createdAt: now,
          })),
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async updateBoard(boardId, updates) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const now = nowIso();

      set((s) => ({
        boards: s.boards.map((b) =>
          b.id === boardId ? { ...b, ...updates, updatedAt: now } : b,
        ),
      }));

      const updated = get().boards.find((b) => b.id === boardId);
      if (shouldSync && updated) {
        await enqueueMutations([
          { id: createId("mutation_"), type: "upsert-board", board: updated, createdAt: now },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async deleteBoard(boardId) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const deletedAt = nowIso();

      const remainingBoards = state.boards.filter((b) => b.id !== boardId);
      const nextActiveBoard = remainingBoards[0]?.id ?? null;

      set((s) => ({
        boards: s.boards.filter((b) => b.id !== boardId),
        columns: s.columns.filter((c) => c.boardId !== boardId),
        labels: s.labels.filter((l) => l.boardId !== boardId),
        tasks: s.tasks.filter((t) => t.boardId !== boardId),
        activeBoard: nextActiveBoard,
      }));

      if (shouldSync) {
        await enqueueMutations([
          { id: createId("mutation_"), type: "delete-board", boardId, deletedAt, createdAt: deletedAt },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    // ---- Column CRUD ----
    async createColumn(boardId, name, options = {}) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const userId = shouldSync ? state.auth.profile?.id ?? null : null;
      const now = nowIso();

      const boardCols = state.columns.filter((c) => c.boardId === boardId);
      const maxOrder = boardCols.reduce((max, c) => Math.max(max, c.order), 0);

      const column: Column = {
        id: createId("col_"),
        boardId,
        userId,
        name: name.trim().slice(0, 60),
        color: options.color ?? null,
        order: maxOrder + 1000,
        wipLimit: options.wipLimit ?? null,
        isTerminal: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: shouldSync ? "pending" : "local-only",
      };

      set((s) => ({ columns: [...s.columns, column] }));

      if (shouldSync) {
        await enqueueMutations([
          { id: createId("mutation_"), type: "upsert-column", column, createdAt: now },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async updateColumn(columnId, updates) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const now = nowIso();

      set((s) => ({
        columns: s.columns.map((c) =>
          c.id === columnId ? { ...c, ...updates, updatedAt: now } : c,
        ),
      }));

      const updated = get().columns.find((c) => c.id === columnId);
      if (shouldSync && updated) {
        await enqueueMutations([
          { id: createId("mutation_"), type: "upsert-column", column: updated, createdAt: now },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async deleteColumn(columnId) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const deletedAt = nowIso();

      // Move tasks in deleted column to first available other column
      const board = state.columns.find((c) => c.id === columnId);
      const boardId = board?.boardId;
      const fallbackCol = state.columns.find(
        (c) => c.boardId === boardId && c.id !== columnId && !c.deletedAt,
      );

      set((s) => ({
        columns: s.columns.filter((c) => c.id !== columnId),
        tasks: s.tasks.map((t) =>
          t.columnId === columnId
            ? { ...t, columnId: fallbackCol?.id ?? null, updatedAt: deletedAt }
            : t,
        ),
      }));

      if (shouldSync) {
        await enqueueMutations([
          { id: createId("mutation_"), type: "delete-column", columnId, deletedAt, createdAt: deletedAt },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async reorderColumns(boardId, orderedColumnIds) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const now = nowIso();
      const idSet = new Set(orderedColumnIds);

      set((s) => ({
        columns: s.columns.map((c) => {
          if (!idSet.has(c.id) || c.boardId !== boardId) return c;
          const idx = orderedColumnIds.indexOf(c.id);
          return { ...c, order: (idx + 1) * 1000, updatedAt: now };
        }),
      }));

      if (shouldSync) {
        const updated = get().columns.filter((c) => idSet.has(c.id));
        await enqueueMutations(
          updated.map((col) => ({
            id: createId("mutation_"),
            type: "upsert-column" as const,
            column: col,
            createdAt: now,
          })),
        );
      } else {
        await persistCurrentState();
      }
    },
    // ---- Label CRUD ----
    async createLabel(boardId, name, color) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const userId = shouldSync ? state.auth.profile?.id ?? null : null;
      const now = nowIso();

      const label: Label = {
        id: createId("label_"),
        boardId,
        userId,
        name: name.trim().slice(0, 48),
        color,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: shouldSync ? "pending" : "local-only",
      };

      set((s) => ({ labels: [...s.labels, label] }));

      if (shouldSync) {
        await enqueueMutations([
          { id: createId("mutation_"), type: "upsert-label", label, createdAt: now },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async updateLabel(labelId, updates) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const now = nowIso();

      set((s) => ({
        labels: s.labels.map((l) =>
          l.id === labelId ? { ...l, ...updates, updatedAt: now } : l,
        ),
      }));

      const updated = get().labels.find((l) => l.id === labelId);
      if (shouldSync && updated) {
        await enqueueMutations([
          { id: createId("mutation_"), type: "upsert-label", label: updated, createdAt: now },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async deleteLabel(labelId) {
      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const deletedAt = nowIso();

      set((s) => ({
        labels: s.labels.filter((l) => l.id !== labelId),
        tasks: s.tasks.map((t) =>
          t.labelIds.includes(labelId)
            ? { ...t, labelIds: t.labelIds.filter((id) => id !== labelId), updatedAt: deletedAt }
            : t,
        ),
      }));

      if (shouldSync) {
        await enqueueMutations([
          { id: createId("mutation_"), type: "delete-label", labelId, deletedAt, createdAt: deletedAt },
        ]);
      } else {
        await persistCurrentState();
      }
    },
    async flushQueue() {
      const state = get();
      if (!isCloudSyncActive(state) || state.isFlushingQueue || state.sync.queue.length === 0) {
        return;
      }

      set({
        isFlushingQueue: true,
        sync: {
          ...state.sync,
          health: state.online ? "syncing" : "offline",
          lastAttemptedSyncAt: nowIso(),
          lastError: null,
        },
      });

      try {
        while (get().sync.queue.length > 0) {
          const current = get();
          const mutation = current.sync.queue[0];
          if (!mutation) {
            break;
          }

          if (mutation.type === "create") {
            const liveTask = current.tasks.find((task) => task.id === mutation.task.id);
            if (liveTask) {
              await upsertRemoteTask({
                ...liveTask,
                userId: current.auth.profile?.id ?? mutation.task.userId,
              });
              set((snapshot) => ({
                tasks: markTaskStatus(snapshot.tasks, [liveTask.id], "synced"),
              }));
            }
          }

          if (mutation.type === "update") {
            const liveTask = current.tasks.find((task) => task.id === mutation.taskId);
            if (liveTask) {
              await upsertRemoteTask({
                ...liveTask,
                userId: current.auth.profile?.id ?? liveTask.userId,
              });
              set((snapshot) => ({
                tasks: markTaskStatus(snapshot.tasks, [liveTask.id], "synced"),
              }));
            }
          }

          if (mutation.type === "delete") {
            await softDeleteRemoteTask(mutation.taskId, mutation.deletedAt);
          }

          if (mutation.type === "reorder") {
            const colId = mutation.columnId;
            const tasksToSync = current.tasks
              .filter((task) => !task.completed && (colId == null || task.columnId === colId))
              .map((task) => ({
                ...task,
                userId: current.auth.profile?.id ?? task.userId,
              }));
            await upsertRemoteTasks(tasksToSync);
            set((snapshot) => ({
              tasks: markTaskStatus(
                snapshot.tasks,
                tasksToSync.map((task) => task.id),
                "synced",
              ),
            }));
          }

          if (mutation.type === "settings") {
            await saveRemoteSettings(mutation.settings);
          }

          if (mutation.type === "upsert-board") {
            await upsertRemoteBoard(mutation.board);
          }

          if (mutation.type === "delete-board") {
            await softDeleteRemoteBoard(mutation.boardId, mutation.deletedAt);
          }

          if (mutation.type === "upsert-column") {
            await upsertRemoteColumn(mutation.column);
          }

          if (mutation.type === "delete-column") {
            await softDeleteRemoteColumn(mutation.columnId, mutation.deletedAt);
          }

          if (mutation.type === "upsert-label") {
            await upsertRemoteLabel(mutation.label);
          }

          if (mutation.type === "delete-label") {
            await softDeleteRemoteLabel(mutation.labelId, mutation.deletedAt);
          }

          set((snapshot) => ({
            sync: {
              ...snapshot.sync,
              queue: snapshot.sync.queue.slice(1),
              lastSuccessfulSyncAt: nowIso(),
              lastAttemptedSyncAt: nowIso(),
              health: snapshot.sync.queue.length > 1 ? "syncing" : "idle",
              lastError: null,
            },
          }));

          await persistCurrentState();
        }

        if (get().sync.queue.length === 0) {
          await get().refreshRemoteState();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed.";
        set((snapshot) => ({
          isFlushingQueue: false,
          tasks: snapshot.tasks.map((task) =>
            task.syncStatus === "pending" ? { ...task, syncStatus: "error" as const } : task,
          ),
          sync: {
            ...snapshot.sync,
            health: snapshot.online ? "error" : "offline",
            lastError: message,
            lastAttemptedSyncAt: nowIso(),
          },
          auth: {
            ...snapshot.auth,
            lastError: message,
          },
        }));
        await persistCurrentState();
        return;
      }

      set({ isFlushingQueue: false });
      await persistCurrentState();
    },
    async refreshRemoteState() {
      if (!get().remoteConfigured || get().auth.status !== "signed-in") {
        return;
      }

      try {
        const remote = await fetchRemoteBootstrap();
        const nextSettings = {
          ...get().settings,
          ...(remote.settings ?? {}),
        };

        applyTheme(nextSettings);

        set((state) => ({
          settings: nextSettings,
          boards: remote.boards.length > 0 ? remote.boards : state.boards,
          columns: remote.columns.length > 0 ? remote.columns : state.columns,
          labels: remote.labels.length > 0 ? remote.labels : state.labels,
          auth: {
            ...state.auth,
            profile: remote.profile,
            status: remote.profile ? "signed-in" : "signed-out",
            lastError: null,
          },
          tasks:
            state.sync.queue.length === 0
              ? remote.tasks.map((task) => ({ ...task, syncStatus: "synced" as const }))
              : state.tasks,
          sync: {
            ...state.sync,
            health: state.online ? (state.sync.queue.length > 0 ? "syncing" : "idle") : "offline",
            lastError: null,
          },
        }));
      } catch (error) {
        set((state) => ({
          sync: {
            ...state.sync,
            health: state.online ? "error" : "offline",
            lastError: error instanceof Error ? error.message : "Remote refresh failed.",
          },
        }));
      } finally {
        await persistCurrentState();
      }
    },
    async resolveImportDecision(strategy) {
      const decision = get().importDecision;
      const userId = get().auth.profile?.id ?? null;
      if (!decision || !userId) {
        return;
      }

      if (strategy === "cloud") {
        set({
          tasks: decision.remoteTasks.map((task) => ({ ...task, syncStatus: "synced" as const })),
          importDecision: null,
          mode: "cloud",
        });
        await persistCurrentState();
        return;
      }

      const mergedTasks = mergeTasksForImport(
        decision.localTasks.map((task) => ({ ...task, userId, syncStatus: "pending" as const })),
        decision.remoteTasks.map((task) => ({ ...task, userId, syncStatus: "pending" as const })),
      );

      set({
        tasks: mergedTasks,
        importDecision: null,
        mode: "cloud",
      });

      try {
        await upsertRemoteTasks(mergedTasks);
        set({
          tasks: mergedTasks.map((task) => ({ ...task, syncStatus: "synced" as const })),
        });
      } catch (error) {
        set((state) => ({
          sync: {
            ...state.sync,
            queue: compactQueue([
              ...state.sync.queue,
              ...mergedTasks.map((task) => ({
                id: createId("mutation_"),
                type: "create" as const,
                task,
                createdAt: nowIso(),
              })),
            ]),
            health: state.online ? "error" : "offline",
            lastError: error instanceof Error ? error.message : "We could not merge into the cloud yet.",
          },
        }));
      }

      await persistCurrentState();
    },
  };
});
