import { useAppStore } from "@/state/appStore";
import { useFilterStore } from "@/state/filterStore";
import type { ActiveView, TaskPriority } from "@shared/types";
import { cn } from "@/lib/utils";
import { PRIORITY_OPTIONS } from "@/components/shared/PriorityBadge";

const VIEW_ICONS: Record<ActiveView, { icon: string; label: string }> = {
  kanban:   { icon: "⬜", label: "Board" },
  list:     { icon: "☰", label: "List" },
  table:    { icon: "⊞", label: "Table" },
  calendar: { icon: "📅", label: "Calendar" },
  timeline: { icon: "📊", label: "Timeline" },
};

type Props = {
  boardId: string | null;
};

export function FilterBar({ boardId }: Props) {
  const filter = useFilterStore();
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const boardLabels = useAppStore((s) =>
    s.labels.filter((l) => l.boardId === boardId && !l.deletedAt),
  );

  const activeFilterCount =
    filter.priorityFilter.length +
    filter.labelFilter.length +
    (filter.dueDatePreset !== "all" ? 1 : 0) +
    (filter.dueDateFrom || filter.dueDateTo ? 1 : 0);

  function togglePriority(p: TaskPriority) {
    const next = filter.priorityFilter.includes(p)
      ? filter.priorityFilter.filter((x) => x !== p)
      : [...filter.priorityFilter, p];
    filter.setPriorityFilter(next);
  }

  function toggleLabel(id: string) {
    const next = filter.labelFilter.includes(id)
      ? filter.labelFilter.filter((x) => x !== id)
      : [...filter.labelFilter, id];
    filter.setLabelFilter(next);
  }

  return (
    <div className="flex flex-col gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2">
      {/* Row 1: search + view switcher */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--muted))]"
            fill="none"
            viewBox="0 0 16 16"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <circle cx="6.5" cy="6.5" r="4" />
            <path d="M11 11l3 3" />
          </svg>
          <input
            type="search"
            placeholder="Search tasks…"
            value={filter.searchText}
            onChange={(e) => filter.setSearch(e.target.value)}
            className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
          />
        </div>

        <div className="flex-1" />

        {/* View switcher */}
        <div className="flex items-center gap-0.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-0.5">
          {(Object.entries(VIEW_ICONS) as [ActiveView, { icon: string; label: string }][]).map(
            ([view, { icon, label }]) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                title={label}
                className={cn(
                  "rounded px-2 py-1 text-sm transition-colors",
                  activeView === view
                    ? "bg-[rgb(var(--surface))] font-semibold text-[rgb(var(--text))] shadow-sm"
                    : "text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]",
                )}
                aria-pressed={activeView === view}
              >
                <span aria-hidden="true">{icon}</span>
                <span className="sr-only">{label}</span>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Row 2: filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Priority chips */}
        <span className="text-[rgb(var(--muted))] font-medium">Priority:</span>
        {PRIORITY_OPTIONS().map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => togglePriority(value)}
            className={cn("filter-chip", filter.priorityFilter.includes(value) && "active")}
          >
            {label}
          </button>
        ))}

        <span className="mx-1 text-[rgb(var(--border))]">|</span>

        {/* Due date presets */}
        <span className="text-[rgb(var(--muted))] font-medium">Due:</span>
        {(["overdue", "today", "this-week"] as const).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() =>
              filter.setDueDatePreset(filter.dueDatePreset === preset ? "all" : preset)
            }
            className={cn("filter-chip capitalize", filter.dueDatePreset === preset && "active")}
          >
            {preset.replace("-", " ")}
          </button>
        ))}

        {/* Labels */}
        {boardLabels.length > 0 && (
          <>
            <span className="mx-1 text-[rgb(var(--border))]">|</span>
            {boardLabels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => toggleLabel(label.id)}
                className={cn(
                  "rounded-full border px-2 py-0.5 transition-colors",
                  filter.labelFilter.includes(label.id)
                    ? "font-semibold"
                    : "opacity-70 hover:opacity-100",
                )}
                style={{
                  borderColor: label.color,
                  color: label.color,
                  backgroundColor: filter.labelFilter.includes(label.id)
                    ? `${label.color}20`
                    : undefined,
                }}
              >
                {label.name}
              </button>
            ))}
          </>
        )}

        {/* Sort */}
        <span className="mx-1 text-[rgb(var(--border))]">|</span>
        <span className="text-[rgb(var(--muted))] font-medium">Sort:</span>
        <select
          value={filter.sortField}
          onChange={(e) => filter.setSortField(e.target.value as Parameters<typeof filter.setSortField>[0])}
          className="rounded border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-1.5 py-0.5 text-xs focus:outline-none"
        >
          <option value="order">Manual</option>
          <option value="priority">Priority</option>
          <option value="dueDate">Due date</option>
          <option value="createdAt">Created</option>
          <option value="updatedAt">Updated</option>
        </select>
        <button
          type="button"
          onClick={filter.toggleSortDirection}
          className="rounded border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-1.5 py-0.5 text-xs hover:border-[rgb(var(--accent))]"
          title={filter.sortDirection === "asc" ? "Ascending" : "Descending"}
        >
          {filter.sortDirection === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={filter.clearFilters}
            className="ml-auto rounded-full bg-[rgb(var(--danger))]/10 px-2 py-0.5 text-[rgb(var(--danger))] font-medium hover:bg-[rgb(var(--danger))]/20 transition-colors"
          >
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </button>
        )}
      </div>
    </div>
  );
}
