import { useState, useRef, useEffect } from "react";
import type { Column } from "@shared/types";
import { useAppStore } from "@/state/appStore";
import { cn } from "@/lib/utils";

type Props = {
  column: Column;
  taskCount: number;
  onAddTask?: () => void;
};

export function ColumnHeader({ column, taskCount, onAddTask }: Props) {
  const updateColumn = useAppStore((s) => s.updateColumn);
  const deleteColumn = useAppStore((s) => s.deleteColumn);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(column.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== column.name) {
      void updateColumn(column.id, { name: trimmed });
    } else {
      setDraftName(column.name);
    }
    setEditing(false);
  }

  const wipOver = column.wipLimit !== null && taskCount > column.wipLimit;
  const dotColor = column.color ?? "rgb(var(--muted))";

  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-2">
      <span
        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />

      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 rounded border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-1.5 py-0.5 text-sm font-semibold text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setDraftName(column.name); setEditing(false); }
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 text-left text-sm font-semibold text-[rgb(var(--text))] hover:text-[rgb(var(--accent))] transition-colors truncate"
        >
          {column.name}
        </button>
      )}

      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums leading-none",
          wipOver
            ? "bg-red-100 text-red-600"
            : "bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]",
        )}
        title={column.wipLimit !== null ? `WIP limit: ${column.wipLimit}` : undefined}
      >
        {taskCount}
        {column.wipLimit !== null && `/${column.wipLimit}`}
      </span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Column options"
          className="rounded p-0.5 text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-muted))] transition-colors"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="3" r="1.2" />
            <circle cx="8" cy="8" r="1.2" />
            <circle cx="8" cy="13" r="1.2" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              aria-hidden="true"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-6 z-30 w-40 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-xl py-1 text-sm">
              <button
                className="w-full px-3 py-1.5 text-left hover:bg-[rgb(var(--surface-muted))] transition-colors"
                onClick={() => { setEditing(true); setMenuOpen(false); }}
              >
                Rename
              </button>
              {onAddTask && (
                <button
                  className="w-full px-3 py-1.5 text-left hover:bg-[rgb(var(--surface-muted))] transition-colors"
                  onClick={() => { onAddTask(); setMenuOpen(false); }}
                >
                  Add task
                </button>
              )}
              <hr className="my-1 border-[rgb(var(--border))]" />
              <button
                className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => { void deleteColumn(column.id); setMenuOpen(false); }}
              >
                Delete column
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
