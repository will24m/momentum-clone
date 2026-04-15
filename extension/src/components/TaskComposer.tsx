import { useEffect, useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";

type TaskComposerProps = {
  focusNonce: number;
  onSubmit: (value: string) => Promise<void>;
};

export function TaskComposer({ focusNonce, onSubmit }: TaskComposerProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [focusNonce]);

  async function handleSubmit() {
    if (!value.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(value);
      setValue("");
    } finally {
      setSubmitting(false);
      textareaRef.current?.focus();
    }
  }

  return (
    <div className="soft-surface p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl accent-chip">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-2 block text-sm font-medium muted-copy" htmlFor="task-composer">
            Add your next move
          </label>
          <textarea
            id="task-composer"
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Write a task, paste several lines, then press Enter."
            className="max-h-40 min-h-[3rem] w-full resize-none border-0 bg-transparent px-0 py-0 text-base leading-7 text-[rgb(var(--text))] placeholder:text-[rgba(var(--muted),0.82)] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: "rgb(var(--accent))" }}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  );
}

