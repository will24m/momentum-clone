import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, GripVertical } from "lucide-react";
import type { SubtaskItem, TaskPriority, TaskSize, TodoTask } from "@shared/types";
import { useAppStore } from "@/state/appStore";
import { PriorityBadge, PRIORITY_OPTIONS } from "@/components/shared/PriorityBadge";
import { LabelPill } from "@/components/shared/LabelPill";
import { cn, createId, nowIso } from "@/lib/utils";

const SIZE_OPTIONS: { value: TaskSize; label: string }[] = [
  { value: "xs", label: "XS" },
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
  { value: "xl", label: "XL" },
];

type Props = {
  taskId: string | null;
  onClose: () => void;
};

export function TaskDetailModal({ taskId, onClose }: Props) {
  const task = useAppStore((s) => s.tasks.find((t) => t.id === taskId) ?? null);
  const columns = useAppStore((s) => s.columns);
  const labels = useAppStore((s) => s.labels);
  const updateTaskDetails = useAppStore((s) => s.updateTaskDetails);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const moveTaskToColumn = useAppStore((s) => s.moveTaskToColumn);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftPriority, setDraftPriority] = useState<TaskPriority | null>(null);
  const [draftSize, setDraftSize] = useState<TaskSize | null>(null);
  const [draftDue, setDraftDue] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftLabelIds, setDraftLabelIds] = useState<string[]>([]);
  const [draftColumnId, setDraftColumnId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!task) return;
    setDraftTitle(task.text);
    setDraftDesc(task.description ?? "");
    setDraftPriority(task.priority);
    setDraftSize(task.size);
    setDraftDue(task.dueDate ?? "");
    setDraftStart(task.startDate ?? "");
    setDraftLabelIds(task.labelIds ?? []);
    setDraftColumnId(task.columnId);
    setSubtasks(task.subtasks ?? []);
  }, [task]);

  useEffect(() => {
    if (taskId) {
      setTimeout(() => titleRef.current?.select(), 50);
    }
  }, [taskId]);

  if (!task || !taskId) return null;

  const boardColumns = columns
    .filter((c) => c.boardId === task.boardId && !c.deletedAt)
    .sort((a, b) => a.order - b.order);

  const boardLabels = labels.filter(
    (l) => l.boardId === task.boardId && !l.deletedAt,
  );

  async function handleSave() {
    if (!task) return;
    await updateTaskDetails(task.id, {
      text: draftTitle || task.text,
      description: draftDesc || null,
      note: null,
      priority: draftPriority,
      size: draftSize,
      dueDate: draftDue || null,
      startDate: draftStart || null,
      labelIds: draftLabelIds,
      subtasks,
    });

    if (draftColumnId && draftColumnId !== task.columnId) {
      const col = columns.find((c) => c.id === draftColumnId);
      const isTerminal = col?.isTerminal ?? false;
      await moveTaskToColumn(task.id, draftColumnId, task.order);
      if (isTerminal !== task.completed) {
        await toggleTask(task.id);
      }
    }
  }

  function toggleSubtask(id: string) {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)),
    );
  }

  function addSubtask() {
    const text = newSubtask.trim();
    if (!text) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: createId("sub_"),
        text,
        completed: false,
        order: (prev[prev.length - 1]?.order ?? 0) + 1000,
      },
    ]);
    setNewSubtask("");
  }

  function removeSubtask(id: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }

  function toggleLabelId(id: string) {
    setDraftLabelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Task details"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => { void handleSave(); onClose(); }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="panel-slide-in relative z-10 flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
            Task Detail
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { void deleteTask(taskId); onClose(); }}
              className="rounded-lg p-1.5 text-[rgb(var(--danger))] hover:bg-red-50 transition-colors"
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { void handleSave(); onClose(); }}
              className="rounded-lg p-1.5 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-muted))] transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Title */}
          <div>
            <label htmlFor="task-detail-title" className="mb-1 block text-xs font-medium uppercase tracking-widest text-[rgb(var(--muted))]">
              Title
            </label>
            <input
              id="task-detail-title"
              ref={titleRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={() => void handleSave()}
              placeholder="Task title"
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
            />
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label htmlFor="task-detail-status" className="mb-1 block text-xs font-medium uppercase tracking-widest text-[rgb(var(--muted))]">
                Status
              </label>
              <select
                id="task-detail-status"
                title="Status"
                value={draftColumnId ?? ""}
                onChange={(e) => setDraftColumnId(e.target.value || null)}
                onBlur={() => void handleSave()}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">No column</option>
                {boardColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-[rgb(var(--muted))]">
                Priority
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Priority">
                {PRIORITY_OPTIONS().map(({ value }) => (
                  <button
                    key={value}
                    type="button"
                    title={value}
                    aria-label={`Priority: ${value}`}
                    aria-pressed={draftPriority === value ? "true" : "false"}
                    onClick={() => setDraftPriority(draftPriority === value ? null : value)}
                    className={cn(
                      "rounded-lg transition-opacity",
                      draftPriority === value ? "opacity-100" : "opacity-45",
                    )}
                  >
                    <PriorityBadge priority={value} />
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div>
              <label htmlFor="task-detail-due" className="mb-1 block text-xs font-medium uppercase tracking-widest text-[rgb(var(--muted))]">
                Due date
              </label>
              <input
                id="task-detail-due"
                type="date"
                title="Due date"
                value={draftDue}
                onChange={(e) => setDraftDue(e.target.value)}
                onBlur={() => void handleSave()}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            {/* Start date */}
            <div>
              <label htmlFor="task-detail-start" className="mb-1 block text-xs font-medium uppercase tracking-widest text-[rgb(var(--muted))]">
                Start date
              </label>
              <input
                id="task-detail-start"
                type="date"
                title="Start date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                onBlur={() => void handleSave()}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            {/* Size */}
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-[rgb(var(--muted))]">
                Effort size
              </span>
              <div className="flex gap-1" role="group" aria-label="Effort size">
                {SIZE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    aria-label={`Size: ${label}`}
                    onClick={() => setDraftSize(draftSize === value ? null : value)}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-xs font-semibold transition-colors",
                      draftSize === value
                        ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-white"
                        : "border-[rgb(var(--border))] text-[rgb(var(--muted))]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Labels */}
          {boardLabels.length > 0 && (
            <div>
              <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-[rgb(var(--muted))]">
                Labels
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Labels">
                {boardLabels.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    title={l.name}
                    aria-label={`Label: ${l.name}`}
                    onClick={() => toggleLabelId(l.id)}
                    className={cn(
                      "transition-opacity",
                      draftLabelIds.includes(l.id) ? "opacity-100" : "opacity-40",
                    )}
                  >
                    <LabelPill name={l.name} color={l.color} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="task-detail-desc" className="mb-1 block text-xs font-medium uppercase tracking-widest text-[rgb(var(--muted))]">
              Description
            </label>
            <textarea
              id="task-detail-desc"
              rows={4}
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              onBlur={() => void handleSave()}
              placeholder="Add a description…"
              className="w-full resize-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-2.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-[rgb(var(--muted))]">
                Subtasks
              </span>
              {subtasks.length > 0 && (
                <span className="text-xs text-[rgb(var(--muted))]">
                  {completedSubtasks}/{subtasks.length} done
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={sub.text}
                    checked={sub.completed}
                    onChange={() => toggleSubtask(sub.id)}
                    className="h-4 w-4 accent-[rgb(var(--accent))]"
                  />
                  <span className={cn("flex-1 text-sm", sub.completed && "line-through text-[rgb(var(--muted))]")}>
                    {sub.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(sub.id)}
                    className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] transition-colors"
                    aria-label="Remove subtask"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                type="text"
                aria-label="New subtask"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                placeholder="Add subtask…"
                className="flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
              />
              <button
                type="button"
                onClick={addSubtask}
                className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-1.5 hover:border-[rgb(var(--accent))] transition-colors"
                aria-label="Add subtask"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[rgb(var(--border))] px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[rgb(var(--surface-muted))] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleSave(); onClose(); }}
            className="rounded-xl bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-white transition-colors hover:-translate-y-0.5"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
