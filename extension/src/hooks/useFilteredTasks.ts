import { useMemo } from "react";
import type { TodoTask } from "@shared/types";
import { useAppStore } from "@/state/appStore";
import { useFilterStore } from "@/state/filterStore";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export function useFilteredTasks(boardId: string | null): TodoTask[] {
  const allTasks = useAppStore((s) => s.tasks);
  const filter = useFilterStore();

  return useMemo(() => {
    let tasks = allTasks.filter(
      (t) => !t.deletedAt && (boardId == null || t.boardId === boardId),
    );

    // Search
    if (filter.searchText) {
      const q = filter.searchText.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.text.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      );
    }

    // Priority filter
    if (filter.priorityFilter.length > 0) {
      tasks = tasks.filter(
        (t) => t.priority && filter.priorityFilter.includes(t.priority),
      );
    }

    // Label filter
    if (filter.labelFilter.length > 0) {
      tasks = tasks.filter((t) =>
        filter.labelFilter.some((id) => t.labelIds.includes(id)),
      );
    }

    // Due date preset
    if (filter.dueDatePreset !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      tasks = tasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const diff = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
        if (filter.dueDatePreset === "overdue") return diff < 0;
        if (filter.dueDatePreset === "today") return diff === 0;
        if (filter.dueDatePreset === "this-week") return diff >= 0 && diff <= 7;
        if (filter.dueDatePreset === "this-month") return diff >= 0 && diff <= 30;
        return true;
      });
    }

    // Custom date range
    if (filter.dueDateFrom || filter.dueDateTo) {
      tasks = tasks.filter((t) => {
        if (!t.dueDate) return false;
        if (filter.dueDateFrom && t.dueDate < filter.dueDateFrom) return false;
        if (filter.dueDateTo && t.dueDate > filter.dueDateTo) return false;
        return true;
      });
    }

    // Assignee filter
    if (filter.assigneeFilter.length > 0) {
      tasks = tasks.filter(
        (t) => t.assigneeId && filter.assigneeFilter.includes(t.assigneeId),
      );
    }

    // Size filter
    if (filter.sizeFilter.length > 0) {
      tasks = tasks.filter((t) => t.size && filter.sizeFilter.includes(t.size));
    }

    // Sort
    tasks = [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (filter.sortField) {
        case "order":
          cmp = a.order - b.order;
          break;
        case "priority": {
          const pa = a.priority ? PRIORITY_ORDER[a.priority] : 99;
          const pb = b.priority ? PRIORITY_ORDER[b.priority] : 99;
          cmp = pa - pb;
          break;
        }
        case "dueDate":
          cmp = (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
          break;
        case "createdAt":
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        case "updatedAt":
          cmp = a.updatedAt.localeCompare(b.updatedAt);
          break;
      }
      return filter.sortDirection === "asc" ? cmp : -cmp;
    });

    return tasks;
  }, [allTasks, boardId, filter]);
}
