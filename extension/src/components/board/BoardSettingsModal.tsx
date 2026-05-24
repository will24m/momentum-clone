import { useEffect, useRef, useState } from "react";
import { X, Trash2, GripVertical, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column, Label } from "@shared/types";
import { useAppStore } from "@/state/appStore";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#94a3b8", "#f87171", "#fb923c", "#fbbf24", "#a3e635",
  "#34d399", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6",
];

function ColorDot({ color, selected, onSelect }: { color: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Color ${color}`}
      className={cn(
        "h-5 w-5 rounded-full transition-transform hover:scale-110",
        selected && "ring-2 ring-offset-1 ring-[rgb(var(--accent))]",
      )}
      style={{ backgroundColor: color } as React.CSSProperties}
    />
  );
}

function SortableColumnRow({
  column,
  onUpdate,
  onDelete,
}: {
  column: Column;
  onUpdate: (id: string, updates: Partial<Pick<Column, "name" | "color" | "wipLimit" | "isTerminal">>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });
  const [editName, setEditName] = useState(column.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [wipInput, setWipInput] = useState(column.wipLimit?.toString() ?? "");

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-2 rounded-xl border border-[rgba(var(--border),0.5)] bg-[rgb(var(--surface))] p-3",
        isDragging && "opacity-50",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label="Reorder column"
        className="mt-1 cursor-grab text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col gap-2">
        {/* Name */}
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => { if (editName.trim()) onUpdate(column.id, { name: editName.trim() }); }}
          placeholder="Column name"
          aria-label="Column name"
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
        />

        <div className="flex flex-wrap items-center gap-3">
          {/* Color */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker((v) => !v)}
              aria-label="Pick color"
              className="flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-2 py-1 text-xs hover:border-[rgb(var(--accent))] transition-colors"
            >
              <span
                className="h-3.5 w-3.5 rounded-full [background-color:var(--col-c)]"
                style={{ "--col-c": column.color ?? "#94a3b8" } as React.CSSProperties}
              />
              Color
            </button>
            {showColorPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} aria-hidden="true" />
                <div className="absolute left-0 top-full z-20 mt-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2 shadow-xl">
                  <div className="grid grid-cols-5 gap-1">
                    {PRESET_COLORS.map((c) => (
                      <ColorDot
                        key={c}
                        color={c}
                        selected={column.color === c}
                        onSelect={() => { onUpdate(column.id, { color: c }); setShowColorPicker(false); }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* WIP limit */}
          <label className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
            WIP
            <input
              type="number"
              min="1"
              value={wipInput}
              onChange={(e) => setWipInput(e.target.value)}
              onBlur={() => {
                const n = parseInt(wipInput, 10);
                onUpdate(column.id, { wipLimit: isNaN(n) ? null : n });
              }}
              placeholder="—"
              aria-label="WIP limit"
              className="w-14 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-2 py-0.5 text-xs focus:outline-none"
            />
          </label>

          {/* Terminal toggle */}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
            <input
              type="checkbox"
              checked={column.isTerminal}
              onChange={(e) => onUpdate(column.id, { isTerminal: e.target.checked })}
              className="rounded accent-[rgb(var(--accent))]"
            />
            Done column
          </label>
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(column.id)}
        aria-label="Delete column"
        className="mt-0.5 text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function LabelRow({
  label,
  onUpdate,
  onDelete,
}: {
  label: Label;
  onUpdate: (id: string, updates: Partial<Pick<Label, "name" | "color">>) => void;
  onDelete: (id: string) => void;
}) {
  const [editName, setEditName] = useState(label.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-[rgba(var(--border),0.5)] bg-[rgb(var(--surface))] px-3 py-2">
      {/* Color swatch */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowColorPicker((v) => !v)}
          aria-label="Pick label color"
          className="h-5 w-5 rounded-full transition-transform hover:scale-110 [background-color:var(--lbl-c)]"
          style={{ "--lbl-c": label.color } as React.CSSProperties}
        />
        {showColorPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} aria-hidden="true" />
            <div className="absolute left-0 top-full z-20 mt-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2 shadow-xl">
              <div className="grid grid-cols-5 gap-1">
                {PRESET_COLORS.map((c) => (
                  <ColorDot
                    key={c}
                    color={c}
                    selected={label.color === c}
                    onSelect={() => { onUpdate(label.id, { color: c }); setShowColorPicker(false); }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <input
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        onBlur={() => { if (editName.trim()) onUpdate(label.id, { name: editName.trim() }); }}
        placeholder="Label name"
        aria-label="Label name"
        className="flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-[rgb(var(--border))] focus:outline-none"
      />

      <button
        type="button"
        onClick={() => onDelete(label.id)}
        aria-label="Delete label"
        className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function BoardSettingsModal() {
  const showBoardSettings = useAppStore((s) => s.showBoardSettings);
  const closeBoardSettings = useAppStore((s) => s.closeBoardSettings);
  const activeBoard = useAppStore((s) => s.activeBoard);
  const boards = useAppStore((s) => s.boards);
  const columns = useAppStore((s) =>
    s.columns
      .filter((c) => c.boardId === activeBoard && !c.deletedAt)
      .sort((a, b) => a.order - b.order),
  );
  const labels = useAppStore((s) =>
    s.labels.filter((l) => l.boardId === activeBoard && !l.deletedAt),
  );
  const updateBoard = useAppStore((s) => s.updateBoard);
  const createColumn = useAppStore((s) => s.createColumn);
  const updateColumn = useAppStore((s) => s.updateColumn);
  const deleteColumn = useAppStore((s) => s.deleteColumn);
  const reorderColumns = useAppStore((s) => s.reorderColumns);
  const createLabel = useAppStore((s) => s.createLabel);
  const updateLabel = useAppStore((s) => s.updateLabel);
  const deleteLabel = useAppStore((s) => s.deleteLabel);

  const board = boards.find((b) => b.id === activeBoard);
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[5]);

  useEffect(() => {
    if (board) {
      setDraftName(board.name);
      setDraftDesc(board.description ?? "");
    }
  }, [board]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeBoard) return;
    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(columns, oldIndex, newIndex);
    void reorderColumns(activeBoard, reordered.map((c) => c.id));
  }

  function handleAddLabel() {
    if (!newLabelName.trim() || !activeBoard) return;
    void createLabel(activeBoard, newLabelName.trim(), newLabelColor);
    setNewLabelName("");
  }

  if (!showBoardSettings || !board || !activeBoard) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Board settings"
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={closeBoardSettings}
        aria-hidden="true"
      />

      <div className="panel-slide-in relative z-10 flex h-full w-full max-w-lg flex-col border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[rgb(var(--border))] px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
            Board Settings
          </span>
          <button
            type="button"
            onClick={closeBoardSettings}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-muted))] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-8 p-6">
          {/* Board info */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
              Board
            </h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="board-name" className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
                  Name
                </label>
                <input
                  id="board-name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => { if (draftName.trim() && draftName !== board.name) void updateBoard(activeBoard, { name: draftName.trim() }); }}
                  placeholder="Board name"
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
                />
              </div>
              <div>
                <label htmlFor="board-desc" className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
                  Description
                </label>
                <textarea
                  id="board-desc"
                  rows={2}
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  onBlur={() => { void updateBoard(activeBoard, { description: draftDesc.trim() || null }); }}
                  placeholder="Optional description…"
                  className="w-full resize-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
                />
              </div>
            </div>
          </section>

          {/* Columns */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
                Columns
              </h2>
              <button
                type="button"
                onClick={() => void createColumn(activeBoard, "New Column")}
                className="flex items-center gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-2 py-1 text-xs hover:border-[rgb(var(--accent))] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add column
              </button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleColumnDragEnd}
            >
              <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {columns.map((col) => (
                    <SortableColumnRow
                      key={col.id}
                      column={col}
                      onUpdate={(id, updates) => void updateColumn(id, updates)}
                      onDelete={(id) => void deleteColumn(id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>

          {/* Labels */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
              Labels
            </h2>
            <div className="space-y-2">
              {labels.map((lbl) => (
                <LabelRow
                  key={lbl.id}
                  label={lbl}
                  onUpdate={(id, updates) => void updateLabel(id, updates)}
                  onDelete={(id) => void deleteLabel(id)}
                />
              ))}
            </div>

            {/* Add label */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex gap-1">
                {PRESET_COLORS.slice(0, 6).map((c) => (
                  <ColorDot
                    key={c}
                    color={c}
                    selected={newLabelColor === c}
                    onSelect={() => setNewLabelColor(c)}
                  />
                ))}
              </div>
              <input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddLabel(); }}
                placeholder="New label…"
                aria-label="New label name"
                className="flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
              />
              <button
                type="button"
                onClick={handleAddLabel}
                aria-label="Add label"
                className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-1.5 hover:border-[rgb(var(--accent))] transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
