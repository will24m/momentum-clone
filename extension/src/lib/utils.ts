import { formatISO } from "date-fns";
import type { AppStats, SyncStatus, TodoTask } from "@shared/types";

const CATEGORY_SWATCHES = [
  {
    background: "rgba(245, 216, 188, 0.94)",
    border: "rgba(201, 124, 71, 0.44)",
    text: "rgb(75, 45, 28)",
    accent: "rgb(193, 113, 61)",
  },
  {
    background: "rgba(221, 234, 201, 0.94)",
    border: "rgba(121, 147, 74, 0.42)",
    text: "rgb(47, 66, 29)",
    accent: "rgb(109, 132, 58)",
  },
  {
    background: "rgba(202, 226, 241, 0.94)",
    border: "rgba(69, 122, 170, 0.42)",
    text: "rgb(30, 57, 85)",
    accent: "rgb(59, 116, 167)",
  },
  {
    background: "rgba(231, 211, 239, 0.94)",
    border: "rgba(137, 92, 163, 0.4)",
    text: "rgb(71, 41, 88)",
    accent: "rgb(134, 87, 162)",
  },
  {
    background: "rgba(248, 220, 220, 0.94)",
    border: "rgba(184, 95, 95, 0.4)",
    text: "rgb(94, 42, 42)",
    accent: "rgb(176, 86, 86)",
  },
  {
    background: "rgba(244, 228, 196, 0.94)",
    border: "rgba(168, 128, 47, 0.42)",
    text: "rgb(92, 66, 20)",
    accent: "rgb(162, 120, 40)",
  },
  {
    background: "rgba(210, 232, 224, 0.94)",
    border: "rgba(74, 138, 116, 0.4)",
    text: "rgb(31, 72, 60)",
    accent: "rgb(69, 129, 108)",
  },
  {
    background: "rgba(228, 219, 213, 0.94)",
    border: "rgba(129, 102, 85, 0.4)",
    text: "rgb(70, 55, 47)",
    accent: "rgb(122, 96, 79)",
  },
] as const;

export type CategoryOption = {
  key: string;
  label: string;
  count: number;
};

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

export function cleanTaskCategory(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 48) : null;
}

export function normalizeCategoryKey(value: string | null | undefined) {
  const cleaned = cleanTaskCategory(value);
  return cleaned ? cleaned.toLocaleLowerCase() : null;
}

export function splitTaskSubnotes(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function cleanTaskNote(value: string | null | undefined) {
  const normalized = splitTaskSubnotes(value).join("\n").slice(0, 4000).trim();
  return normalized ? normalized : null;
}

export function splitTaskInput(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getCategoryAppearance(category: string) {
  let hash = 0;
  for (const character of category.toLocaleLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return CATEGORY_SWATCHES[hash % CATEGORY_SWATCHES.length];
}

export function getCategoryOptions(tasks: TodoTask[]): CategoryOption[] {
  const categories = new Map<string, CategoryOption>();

  tasks.forEach((task) => {
    if (task.deletedAt) {
      return;
    }

    const label = cleanTaskCategory(task.category);
    const key = normalizeCategoryKey(label);
    if (!label || !key) {
      return;
    }

    const existing = categories.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }

    categories.set(key, {
      key,
      label,
      count: 1,
    });
  });

  return [...categories.values()].sort((left, right) => left.label.localeCompare(right.label));
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
    category?: string | null;
    note?: string | null;
  } = {},
) {
  const timestamp = nowIso();

  return {
    id: createId("task_"),
    userId: options.userId ?? null,
    text: text.trim(),
    category: cleanTaskCategory(options.category),
    note: cleanTaskNote(options.note),
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
      category: task.category,
      note: task.note,
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
