import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { useAppStore } from "@/state/appStore";
import { PRIORITY_OPTIONS } from "@/components/shared/PriorityBadge";
import type { TaskPriority } from "@shared/types";

export function BulkActionBar() {
  const selectedTaskIds = useAppStore((s) => s.selectedTaskIds);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const bulkMoveToColumn = useAppStore((s) => s.bulkMoveToColumn);
  const bulkDeleteTasks = useAppStore((s) => s.bulkDeleteTasks);
  const bulkSetPriority = useAppStore((s) => s.bulkSetPriority);
  const activeBoard = useAppStore((s) => s.activeBoard);
  const columns = useAppStore((s) =>
    s.columns
      .filter((c) => c.boardId === activeBoard && !c.deletedAt)
      .sort((a, b) => a.order - b.order),
  );

  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") clearSelection();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection]);

  if (selectedTaskIds.length === 0) return null;

  const count = selectedTaskIds.length;

  return (
    <div
      ref={barRef}
      className="bulk-bar-enter fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 shadow-2xl">
        <span className="mr-1 text-sm font-semibold">
          {count} selected
        </span>

        {/* Move to column */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowMoveMenu((v) => !v); setShowPriorityMenu(false); }}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-1.5 text-xs font-medium hover:border-[rgb(var(--accent))] transition-colors"
          >
            Move to…
          </button>
          {showMoveMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMoveMenu(false)} aria-hidden="true" />
              <div className="absolute bottom-full left-0 z-20 mb-1 min-w-[160px] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-1 shadow-xl">
                {columns.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => { void bulkMoveToColumn(col.id); setShowMoveMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[rgb(var(--surface-muted))] transition-colors"
                  >
                    {col.color && (
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0 [background-color:var(--col-color)]"
                        style={{ "--col-color": col.color } as React.CSSProperties}
                      />
                    )}
                    {col.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Set priority */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowPriorityMenu((v) => !v); setShowMoveMenu(false); }}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-1.5 text-xs font-medium hover:border-[rgb(var(--accent))] transition-colors"
          >
            Set priority…
          </button>
          {showPriorityMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPriorityMenu(false)} aria-hidden="true" />
              <div className="absolute bottom-full left-0 z-20 mb-1 w-36 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-1 shadow-xl">
                {PRIORITY_OPTIONS().map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { void bulkSetPriority(value as TaskPriority); setShowPriorityMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[rgb(var(--surface-muted))] transition-colors"
                  >
                    {label}
                  </button>
                ))}
                <hr className="my-1 border-[rgb(var(--border))]" />
                <button
                  type="button"
                  onClick={() => { void bulkSetPriority(null); setShowPriorityMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-muted))] transition-colors"
                >
                  Clear priority
                </button>
              </div>
            </>
          )}
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={() => void bulkDeleteTasks()}
          className="flex items-center gap-1.5 rounded-lg border border-transparent bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:border-red-200 transition-colors"
          aria-label={`Delete ${count} selected tasks`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete {count}
        </button>

        {/* Dismiss */}
        <button
          type="button"
          onClick={clearSelection}
          className="ml-1 rounded-lg p-1.5 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-muted))] transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
