import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from "react";
import {
  Check,
  GripVertical,
  PencilLine,
  Save,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { TodoTask } from "@shared/types";
import { cn, getCategoryAppearance, getCategoryOptions, normalizeCategoryKey, splitTaskSubnotes } from "@/lib/utils";
import { useAppStore } from "@/state/appStore";

type TaskRowProps = {
  task: TodoTask;
  style?: CSSProperties;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  draggable?: boolean;
};

export function TaskRow({ task, style, dragHandleProps, draggable = false }: TaskRowProps) {
  const tasks = useAppStore((store) => store.tasks);
  const toggleTask = useAppStore((store) => store.toggleTask);
  const updateTaskDetails = useAppStore((store) => store.updateTaskDetails);
  const deleteTask = useAppStore((store) => store.deleteTask);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(task.text);
  const [draftCategory, setDraftCategory] = useState(task.category ?? "");
  const [draftNote, setDraftNote] = useState(task.note ?? "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const categoryListId = useId();
  const availableCategories = getCategoryOptions(tasks);
  const selectedCategoryKey = normalizeCategoryKey(draftCategory);
  const subnotes = splitTaskSubnotes(task.note);
  const categoryAppearance = task.category ? getCategoryAppearance(task.category) : null;
  const statusLabel =
    task.syncStatus === "pending" ? "Syncing" : task.syncStatus === "error" ? "Saved here" : null;

  useEffect(() => {
    setDraftText(task.text);
    setDraftCategory(task.category ?? "");
    setDraftNote(task.note ?? "");
  }, [task.text, task.category, task.note]);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);

  async function saveDraft() {
    await updateTaskDetails(task.id, {
      text: draftText,
      category: draftCategory,
      note: draftNote,
    });
    setIsEditing(false);
  }

  function cancelEditing() {
    setDraftText(task.text);
    setDraftCategory(task.category ?? "");
    setDraftNote(task.note ?? "");
    setIsEditing(false);
  }

  return (
    <div
      style={style}
      className={cn(
        "group flex items-start gap-3 rounded-[1.6rem] border px-4 py-4 transition shadow-[0_12px_26px_rgba(31,28,25,0.04)] hover:-translate-y-0.5",
        task.syncStatus === "error" ? "border-[rgba(var(--danger),0.45)]" : "border-[rgba(var(--border),0.38)]",
        "bg-[rgba(var(--surface),0.96)] hover:border-[rgba(var(--accent),0.28)] hover:bg-[rgba(var(--surface),0.99)]",
      )}
    >
      <button
        type="button"
        aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
        onClick={() => void toggleTask(task.id)}
        className={cn(
          "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition",
          task.completed
            ? "border-transparent text-white"
            : "border-[rgba(var(--border),0.9)] text-transparent hover:border-[rgba(var(--accent),0.7)]",
        )}
        style={task.completed ? { backgroundColor: "rgb(var(--success))" } : undefined}
      >
        <Check className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-[11px] uppercase tracking-[0.18em] muted-copy">
            {task.completed ? "Done" : "Active"}
          </p>
          {task.category ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: categoryAppearance?.background,
                borderColor: categoryAppearance?.border,
                color: categoryAppearance?.text,
              }}
            >
              <Tag className="h-3 w-3" />
              {task.category}
            </span>
          ) : null}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={draftText}
              rows={2}
              onChange={(event) => setDraftText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEditing();
                }
              }}
              className="min-h-[3rem] w-full resize-none rounded-[1.2rem] border border-[rgba(var(--border),0.5)] bg-[rgba(var(--surface),0.96)] px-3 py-3 text-[15px] leading-6 text-[rgb(var(--text))] focus:outline-none"
            />

            <div className="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] muted-copy">
                  <Tag className="h-3.5 w-3.5" />
                  Category
                </span>
                <input
                  list={categoryListId}
                  value={draftCategory}
                  onChange={(event) => setDraftCategory(event.target.value)}
                  placeholder="Category"
                  className="w-full rounded-[1rem] border border-[rgba(var(--border),0.5)] bg-[rgba(var(--surface),0.96)] px-3 py-2.5 text-sm focus:outline-none"
                />
                <datalist id={categoryListId}>
                  {availableCategories.map((option) => (
                    <option key={option.key} value={option.label} />
                  ))}
                </datalist>
                {availableCategories.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableCategories.map((option) => {
                      const appearance = getCategoryAppearance(option.label);
                      const isSelected = selectedCategoryKey === option.key;

                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setDraftCategory(option.label)}
                          className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition hover:-translate-y-[1px]"
                          style={{
                            backgroundColor: appearance.background,
                            borderColor: appearance.border,
                            color: appearance.text,
                            boxShadow: isSelected ? `0 0 0 2px ${appearance.border}` : "none",
                            opacity: isSelected ? 1 : 0.88,
                          }}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: appearance.accent }}
                          />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] muted-copy">
                  <StickyNote className="h-3.5 w-3.5" />
                  Subnotes
                </span>
                <textarea
                  rows={4}
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  placeholder="Add one subnote per line"
                  className="w-full resize-none rounded-[1rem] border border-[rgba(var(--border),0.5)] bg-[rgba(var(--surface),0.96)] px-3 py-2.5 text-sm leading-6 focus:outline-none"
                />
                <p className="mt-2 text-xs muted-copy">One line per subnote.</p>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void saveDraft()}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "rgb(var(--accent))" }}
              >
                <Save className="h-4 w-4" />
                Save
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(var(--border),0.45)] bg-[rgba(var(--surface),0.84)] px-4 py-2.5 text-sm font-medium"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setIsEditing(true)} className="w-full text-left">
            <span
              className={cn(
                "block whitespace-pre-wrap break-words text-[15px] leading-6 transition",
                task.completed && "muted-copy line-through",
              )}
            >
              {task.text}
            </span>

            {subnotes.length ? (
              <span className="mt-3 block rounded-[1rem] bg-[rgba(var(--surface-muted),0.72)] px-3 py-3">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] muted-copy">
                  Subnotes
                </span>
                <span className="block space-y-2">
                  {subnotes.map((subnote, index) => (
                    <span key={`${task.id}_subnote_${index}`} className="flex items-start gap-2 text-sm leading-6 muted-copy">
                      <span className="mt-[0.48rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--accent))]" />
                      <span className="whitespace-pre-wrap break-words">{subnote}</span>
                    </span>
                  ))}
                </span>
              </span>
            ) : null}
          </button>
        )}

        {statusLabel ? (
          <div className="mt-3 flex items-center gap-2 text-xs muted-copy">
            <span className="rounded-full bg-[rgba(var(--surface-muted),0.92)] px-2 py-1">
              {statusLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-100 transition md:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
        {draggable ? (
          <button
            type="button"
            aria-label="Reorder task"
            className="rounded-2xl p-2 muted-copy transition hover:bg-[rgba(var(--surface-muted),0.9)] hover:text-[rgb(var(--text))]"
            {...dragHandleProps}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        {!isEditing ? (
          <button
            type="button"
            aria-label="Edit task"
            onClick={() => setIsEditing(true)}
            className="rounded-2xl p-2 muted-copy transition hover:bg-[rgba(var(--surface-muted),0.9)] hover:text-[rgb(var(--text))]"
          >
            <PencilLine className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Delete task"
          onClick={() => void deleteTask(task.id)}
          className="rounded-2xl p-2 text-[rgb(var(--danger))] transition hover:bg-[rgba(var(--surface-muted),0.9)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
