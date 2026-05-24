import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import type { TodoTask } from "@shared/types";
import { useAppStore } from "@/state/appStore";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { useFilterStore } from "@/state/filterStore";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { DueDateBadge } from "@/components/shared/DueDateBadge";
import { LabelPill } from "@/components/shared/LabelPill";
import { SizeBadge } from "@/components/shared/SizeBadge";
import { cn } from "@/lib/utils";

type SortableField = "text" | "priority" | "dueDate" | "size" | "createdAt";

type Props = {
  boardId: string;
  onOpenDetail?: (taskId: string) => void;
};

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SIZE_RANK: Record<string, number> = { xs: 0, sm: 1, md: 2, lg: 3, xl: 4 };

export function TableView({ boardId, onOpenDetail }: Props) {
  const tasks = useFilteredTasks(boardId);
  const columns = useAppStore((s) =>
    s.columns
      .filter((c) => c.boardId === boardId && !c.deletedAt)
      .sort((a, b) => a.order - b.order),
  );
  const allLabels = useAppStore((s) => s.labels);
  const selectedTaskIds = useAppStore((s) => s.selectedTaskIds);
  const toggleTaskSelection = useAppStore((s) => s.toggleTaskSelection);
  const selectAll = useAppStore((s) => s.selectAll);
  const clearSelection = useAppStore((s) => s.clearSelection);

  const [localSort, setLocalSort] = useState<{ field: SortableField; dir: "asc" | "desc" }>({
    field: "createdAt",
    dir: "asc",
  });

  function toggleSort(field: SortableField) {
    setLocalSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" },
    );
  }

  const colMap = new Map(columns.map((c) => [c.id, c]));
  const labelMap = new Map(allLabels.map((l) => [l.id, l]));

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (localSort.field) {
      case "text":
        cmp = a.text.localeCompare(b.text);
        break;
      case "priority":
        cmp = (PRIORITY_RANK[a.priority ?? ""] ?? 99) - (PRIORITY_RANK[b.priority ?? ""] ?? 99);
        break;
      case "dueDate":
        cmp = (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
        break;
      case "size":
        cmp = (SIZE_RANK[a.size ?? ""] ?? 99) - (SIZE_RANK[b.size ?? ""] ?? 99);
        break;
      case "createdAt":
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
    }
    return localSort.dir === "asc" ? cmp : -cmp;
  });

  const allSelected = sorted.length > 0 && sorted.every((t) => selectedTaskIds.includes(t.id));

  function toggleAll() {
    if (allSelected) clearSelection();
    else selectAll(sorted.map((t) => t.id));
  }

  function SortIcon({ field }: { field: SortableField }) {
    if (localSort.field !== field) return <span className="opacity-30">↕</span>;
    return <span>{localSort.dir === "asc" ? "↑" : "↓"}</span>;
  }

  function HeaderCell({ field, label, className }: { field: SortableField; label: string; className?: string }) {
    return (
      <th
        className={cn("cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors", className)}
        onClick={() => toggleSort(field)}
      >
        <span className="flex items-center gap-1">
          {label} <SortIcon field={field} />
        </span>
      </th>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
          <tr>
            <th className="w-10 px-3 py-2">
              <button
                type="button"
                onClick={toggleAll}
                aria-label={allSelected ? "Deselect all" : "Select all"}
                className="text-[rgb(var(--muted))] hover:text-[rgb(var(--accent))] transition-colors"
              >
                {allSelected
                  ? <CheckSquare className="h-4 w-4" />
                  : <Square className="h-4 w-4" />
                }
              </button>
            </th>
            <HeaderCell field="text" label="Title" className="min-w-[240px]" />
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted))]">Status</th>
            <HeaderCell field="priority" label="Priority" />
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted))]">Labels</th>
            <HeaderCell field="dueDate" label="Due" />
            <HeaderCell field="size" label="Size" />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-[rgb(var(--muted))]">
                No tasks match the current filters.
              </td>
            </tr>
          )}
          {sorted.map((task) => {
            const isSelected = selectedTaskIds.includes(task.id);
            const col = task.columnId ? colMap.get(task.columnId) : null;
            const taskLabels = task.labelIds.map((id) => labelMap.get(id)).filter(Boolean);

            return (
              <tr
                key={task.id}
                className={cn(
                  "border-b border-[rgba(var(--border),0.4)] transition-colors hover:bg-[rgba(var(--surface-muted),0.5)]",
                  isSelected && "bg-[rgba(var(--accent),0.06)]",
                )}
              >
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleTaskSelection(task.id)}
                    aria-label={isSelected ? "Deselect task" : "Select task"}
                    className="text-[rgb(var(--muted))] hover:text-[rgb(var(--accent))] transition-colors"
                  >
                    {isSelected
                      ? <CheckSquare className="h-4 w-4 text-[rgb(var(--accent))]" />
                      : <Square className="h-4 w-4" />
                    }
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onOpenDetail?.(task.id)}
                    className={cn(
                      "max-w-xs truncate text-left font-medium transition-colors hover:text-[rgb(var(--accent))]",
                      task.completed && "line-through opacity-60",
                    )}
                  >
                    {task.text}
                  </button>
                </td>
                <td className="px-3 py-2">
                  {col && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--border),0.5)] px-2 py-0.5 text-xs">
                      {col.color && (
                        <span
                          className="h-1.5 w-1.5 rounded-full flex-shrink-0 [background-color:var(--col-color)]"
                          style={{ "--col-color": col.color } as React.CSSProperties}
                        />
                      )}
                      {col.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {task.priority && <PriorityBadge priority={task.priority} compact />}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {taskLabels.map((l) => l && (
                      <LabelPill key={l.id} name={l.name} color={l.color} />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {task.dueDate && <DueDateBadge dueDate={task.dueDate} />}
                </td>
                <td className="px-3 py-2">
                  {task.size && <SizeBadge size={task.size} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
