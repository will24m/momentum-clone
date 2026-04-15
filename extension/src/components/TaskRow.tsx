import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from "react";
import { Check, GripVertical, PencilLine, Trash2, X } from "lucide-react";
import type { TodoTask } from "@shared/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/state/appStore";

type TaskRowProps = {
  task: TodoTask;
  style?: CSSProperties;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  draggable?: boolean;
};

export function TaskRow({ task, style, dragHandleProps, draggable = false }: TaskRowProps) {
  const toggleTask = useAppStore((store) => store.toggleTask);
  const updateTaskText = useAppStore((store) => store.updateTaskText);
  const deleteTask = useAppStore((store) => store.deleteTask);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(task.text);
  }, [task.text]);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);

  async function saveDraft() {
    setIsEditing(false);
    if (draft !== task.text) {
      await updateTaskText(task.id, draft);
    }
  }

  return (
    <div
      style={style}
      className={cn(
        "group flex items-start gap-3 rounded-3xl border px-4 py-3 transition",
        task.syncStatus === "error" ? "border-[rgba(var(--danger),0.45)]" : "hairline",
        "bg-[rgba(var(--surface),0.78)] hover:bg-[rgba(var(--surface),0.96)]",
      )}
    >
      <button
        type="button"
        aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
        onClick={() => void toggleTask(task.id)}
        className={cn(
          "mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
          task.completed
            ? "border-transparent text-white"
            : "border-[rgba(var(--border),0.9)] text-transparent hover:border-[rgba(var(--accent),0.7)]",
        )}
        style={task.completed ? { backgroundColor: "rgb(var(--success))" } : undefined}
      >
        <Check className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            rows={1}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void saveDraft()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraft(task.text);
                setIsEditing(false);
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void saveDraft();
              }
            }}
            className="min-h-[2rem] w-full resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-7 text-[rgb(var(--text))] focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="w-full text-left"
          >
            <span
              className={cn(
                "block whitespace-pre-wrap break-words text-[15px] leading-7 transition",
                task.completed && "muted-copy line-through",
              )}
            >
              {task.text}
            </span>
          </button>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs muted-copy">
          <span className="rounded-full bg-[rgba(var(--surface-muted),0.92)] px-2 py-1">
            {task.syncStatus === "pending" ? "Pending sync" : task.syncStatus === "error" ? "Saved locally" : "Ready"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
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
        ) : (
          <button
            type="button"
            aria-label="Cancel editing"
            onClick={() => {
              setDraft(task.text);
              setIsEditing(false);
            }}
            className="rounded-2xl p-2 muted-copy transition hover:bg-[rgba(var(--surface-muted),0.9)] hover:text-[rgb(var(--text))]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
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
