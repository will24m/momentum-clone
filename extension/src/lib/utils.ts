import { formatISO } from "date-fns";
import type { AppStats, SyncStatus, TodoTask } from "@shared/types";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function createId(prefix = "") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}${crypto.randomUUID()}`;
  }

  return `${prefix}${Math.random().toString(36).slice(2, 11)}`;
}

export function nowIso() {
  return formatISO(new Date());
}

export function splitTaskInput(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function computeNextOrder(tasks: TodoTask[], completed: boolean) {
  const scoped = tasks.filter((task) => task.completed === completed);
  if (!scoped.length) {
    return 1000;
  }

  return Math.max(...scoped.map((task) => task.order)) + 1000;
}

export function buildTask(
  text: string,
  options: {
    userId?: string | null;
    status?: SyncStatus;
    completed?: boolean;
    order?: number;
  } = {},
) {
  const timestamp = nowIso();

  return {
    id: createId("task_"),
    userId: options.userId ?? null,
    text: text.trim(),
    completed: options.completed ?? false,
    order: options.order ?? 1000,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    syncStatus: options.status ?? "local-only",
  } satisfies TodoTask;
}

export function sortTasks(tasks: TodoTask[]) {
  return [...tasks].sort((left, right) => {
    if (left.completed !== right.completed) {
      return Number(left.completed) - Number(right.completed);
    }

    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function partitionTasks(tasks: TodoTask[]) {
  const sorted = sortTasks(tasks.filter((task) => !task.deletedAt));

  return {
    active: sorted.filter((task) => !task.completed),
    completed: sorted.filter((task) => task.completed),
  };
}

export function resequenceSection(tasks: TodoTask[], completed: boolean) {
  const scoped = tasks
    .filter((task) => task.completed === completed && !task.deletedAt)
    .sort((left, right) => left.order - right.order)
    .map((task, index) => ({
      ...task,
      order: (index + 1) * 1000,
    }));

  return scoped;
}

export function resequenceTasks(tasks: TodoTask[]) {
  const active = resequenceSection(tasks, false);
  const completed = resequenceSection(tasks, true);
  const deleted = tasks.filter((task) => task.deletedAt);

  return sortTasks([...active, ...completed, ...deleted]);
}

export function getTaskStats(tasks: TodoTask[]): AppStats {
  const visibleTasks = tasks.filter((task) => !task.deletedAt);
  const activeCount = visibleTasks.filter((task) => !task.completed).length;
  const completedCount = visibleTasks.filter((task) => task.completed).length;
  const total = activeCount + completedCount;

  return {
    activeCount,
    completedCount,
    completionRate: total === 0 ? 0 : Math.round((completedCount / total) * 100),
  };
}

export function markTaskStatus(tasks: TodoTask[], taskIds: string[], syncStatus: SyncStatus) {
  const idSet = new Set(taskIds);
  return tasks.map((task) => (idSet.has(task.id) ? { ...task, syncStatus } : task));
}

export function syncStatusForMode(isCloudMode: boolean, signedIn: boolean): SyncStatus {
  return isCloudMode && signedIn ? "pending" : "local-only";
}

export function tasksFingerprint(tasks: TodoTask[]) {
  return JSON.stringify(
    sortTasks(tasks).map((task) => ({
      id: task.id,
      text: task.text,
      completed: task.completed,
      order: task.order,
      updatedAt: task.updatedAt,
      deletedAt: task.deletedAt,
    })),
  );
}

export function mergeTasksForImport(localTasks: TodoTask[], remoteTasks: TodoTask[]) {
  const merged = new Map<string, TodoTask>();

  [...remoteTasks, ...localTasks].forEach((task) => {
    const existing = merged.get(task.id);
    if (!existing || existing.updatedAt < task.updatedAt) {
      merged.set(task.id, task);
    }
  });

  return resequenceTasks([...merged.values()]);
}

