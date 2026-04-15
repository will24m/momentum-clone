import { create } from "zustand";
import type {
  AppMode,
  ImportDecisionState,
  PendingMutation,
  PersistedSnapshot,
  TodoTask,
  UserSettings,
} from "@shared/types";
import { DEFAULT_AUTH_STATE, DEFAULT_SETTINGS, DEFAULT_SYNC_STATE } from "@shared/types";
import { loadSnapshot, saveSnapshot } from "@/lib/chromeStorage";
import {
  fetchRemoteBootstrap,
  getRemoteProfile,
  requestMagicCode,
  saveRemoteSettings,
  signOutRemote,
  softDeleteRemoteTask,
  upsertRemoteTask,
  upsertRemoteTasks,
  verifyMagicCode as verifyRemoteMagicCode,
} from "@/lib/remote";
import { hasRemoteConfig } from "@/lib/supabase";
import { applyTheme } from "@/lib/theme";
import {
  buildTask,
  computeNextOrder,
  createId,
  markTaskStatus,
  mergeTasksForImport,
  nowIso,
  partitionTasks,
  resequenceTasks,
  tasksFingerprint,
} from "@/lib/utils";

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
  importDecision: ImportDecisionState | null;
  toasts: ToastItem[];
  composerFocusNonce: number;
  initialize: () => Promise<void>;
  setOnline: (online: boolean) => void;
  focusComposer: () => void;
  dismissToast: (toastId: string) => void;
  triggerToastAction: (toastId: string) => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  resetAuthFlow: () => void;
  dismissWelcome: (mode: AppMode) => Promise<void>;
  sendMagicCode: (email: string) => Promise<void>;
  verifyMagicCode: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchMode: (mode: AppMode) => Promise<void>;
  addTasksFromInput: (value: string) => Promise<void>;
  updateTaskText: (taskId: string, text: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  restoreTasks: (tasks: TodoTask[]) => Promise<void>;
  reorderActiveTasks: (orderedTaskIds: string[]) => Promise<void>;
  clearCompleted: () => Promise<void>;
  toggleCompletedSection: () => Promise<void>;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  flushQueue: () => Promise<void>;
  refreshRemoteState: () => Promise<void>;
  resolveImportDecision: (strategy: "merge" | "cloud") => Promise<void>;
};

const initialSnapshot: PersistedSnapshot = {
  tasks: [],
  settings: DEFAULT_SETTINGS,
  mode: "local",
  sync: DEFAULT_SYNC_STATE,
  auth: {
    ...DEFAULT_AUTH_STATE,
    status: "unknown",
  },
  welcomeDismissed: false,
};

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
    settings: state.settings,
    mode: state.mode,
    sync: state.sync,
    auth: state.auth,
    welcomeDismissed: state.welcomeDismissed,
  };
}

function compactQueue(queue: PendingMutation[]) {
  const latestSettings = [...queue].reverse().find((entry) => entry.type === "settings");
  const latestReorder = [...queue].reverse().find((entry) => entry.type === "reorder");

  return queue.filter((entry) => {
    if (entry.type === "settings") {
      return latestSettings?.id === entry.id;
    }

    if (entry.type === "reorder") {
      return latestReorder?.id === entry.id;
    }

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
    importDecision: null,
    toasts: [],
    composerFocusNonce: 0,
    async initialize() {
      if (get().initializing) {
        return;
      }

      set({
        initializing: true,
        remoteConfigured: hasRemoteConfig(),
      });

      const snapshot = await loadSnapshot();
      const nextSnapshot = snapshot ?? initialSnapshot;
      applyTheme(nextSnapshot.settings);

      set({
        ...nextSnapshot,
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
    async addTasksFromInput(value) {
      const entries = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (!entries.length) {
        return;
      }

      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const userId = shouldSync ? state.auth.profile?.id ?? null : null;
      let nextTasks = [...state.tasks];

      const createdTasks = entries.map((entry, index) =>
        buildTask(entry, {
          userId,
          status: shouldSync ? "pending" : "local-only",
          order: computeNextOrder(nextTasks, false) + index * 1000,
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
      const trimmed = text.trim();
      if (!trimmed) {
        await get().deleteTask(taskId);
        return;
      }

      const state = get();
      const shouldSync = state.mode === "cloud" && state.auth.status === "signed-in";
      const updatedAt = nowIso();
      const nextTasks = state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              text: trimmed,
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
              text: trimmed,
              updatedAt,
            },
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
      const nextOrder = computeNextOrder(state.tasks.filter((task) => task.id !== taskId), nextCompletedState);
      const nextTasks = resequenceTasks(
        state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completed: nextCompletedState,
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
            orderedTaskIds,
            createdAt: nowIso(),
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
            const activeTasks = current.tasks
              .filter((task) => !task.completed)
              .map((task) => ({
                ...task,
                userId: current.auth.profile?.id ?? task.userId,
              }));
            await upsertRemoteTasks(activeTasks);
            set((snapshot) => ({
              tasks: markTaskStatus(
                snapshot.tasks,
                activeTasks.map((task) => task.id),
                "synced",
              ),
            }));
          }

          if (mutation.type === "settings") {
            await saveRemoteSettings(mutation.settings);
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
