import type { Board, Column, Label, PersistedSnapshot, TodoTask } from "@shared/types";
import { createId, nowIso } from "@/lib/utils";

export const SCHEMA_V2 = 2;

export function needsMigration(snapshot: PersistedSnapshot): boolean {
  return (snapshot.schemaVersion ?? 1) < SCHEMA_V2;
}

export function migrateSnapshotToV2(
  snapshot: PersistedSnapshot,
  userId: string | null,
): PersistedSnapshot {
  const syncStatus = userId ? ("pending" as const) : ("local-only" as const);
  const now = nowIso();

  // --- Default board ---
  const boardId = createId("board_");
  const board: Board = {
    id: boardId,
    userId,
    name: "My Board",
    description: null,
    order: 1000,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus,
  };

  // --- Default columns ---
  const colTodoId = createId("col_");
  const colProgressId = createId("col_");
  const colDoneId = createId("col_");

  const columns: Column[] = [
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
      syncStatus,
    },
    {
      id: colProgressId,
      boardId,
      userId,
      name: "In Progress",
      color: "#818cf8",
      order: 2000,
      wipLimit: null,
      isTerminal: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus,
    },
    {
      id: colDoneId,
      boardId,
      userId,
      name: "Done",
      color: "#4ade80",
      order: 3000,
      wipLimit: null,
      isTerminal: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus,
    },
  ];

  // --- Labels from unique category strings ---
  const categoryLabelMap = new Map<string, Label>();
  for (const task of snapshot.tasks) {
    if (!task.category) continue;
    const key = task.category.trim().toLowerCase();
    if (!key || categoryLabelMap.has(key)) continue;
    categoryLabelMap.set(key, {
      id: createId("label_"),
      boardId,
      userId,
      name: task.category.trim(),
      color: "#94a3b8",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus,
    });
  }
  const labels: Label[] = [...categoryLabelMap.values()];

  // --- Migrate tasks ---
  const migratedTasks: TodoTask[] = snapshot.tasks.map((task) => {
    const catKey = task.category?.trim().toLowerCase() ?? null;
    const labelId = catKey ? (categoryLabelMap.get(catKey)?.id ?? null) : null;
    return {
      ...task,
      boardId,
      columnId: task.completed ? colDoneId : colTodoId,
      description: task.description ?? task.note,
      labelIds: labelId ? [labelId] : (task.labelIds ?? []),
      priority: task.priority ?? null,
      size: task.size ?? null,
      dueDate: task.dueDate ?? null,
      startDate: task.startDate ?? null,
      assigneeId: task.assigneeId ?? null,
      subtasks: task.subtasks ?? [],
      syncStatus,
    };
  });

  // --- Drain stale V1 reorder mutations (they have no columnId) ---
  const cleanedQueue = (snapshot.sync?.queue ?? []).filter(
    (m) => m.type !== "reorder",
  );

  return {
    ...snapshot,
    tasks: migratedTasks,
    boards: [board],
    columns,
    labels,
    activeBoard: boardId,
    activeView: "kanban",
    schemaVersion: SCHEMA_V2,
    sync: {
      ...snapshot.sync,
      queue: cleanedQueue,
    },
  };
}
