import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FolderPlus, Plus, StickyNote } from "lucide-react";
import { getCategoryAppearance, getCategoryOptions, normalizeCategoryKey } from "@/lib/utils";
import { useAppStore } from "@/state/appStore";

type TaskComposerProps = {
  focusNonce: number;
  onSubmit: (input: { text: string; category?: string | null; note?: string | null }) => Promise<void>;
};

export function TaskComposer({ focusNonce, onSubmit }: TaskComposerProps) {
  const tasks = useAppStore((store) => store.tasks);
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const categoryListId = useId();
  const availableCategories = getCategoryOptions(tasks);
  const selectedCategoryKey = normalizeCategoryKey(category);

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
      await onSubmit({
        text: value,
        category,
        note,
      });
      setValue("");
      setCategory("");
      setNote("");
      setShowDetails(false);
    } finally {
      setSubmitting(false);
      textareaRef.current?.focus();
    }
  }

  const hasDetails = Boolean(category.trim() || note.trim());

  return (
    <div className="rounded-[2rem] border border-[rgba(var(--accent),0.22)] bg-[rgba(var(--surface),0.92)] px-4 py-5 shadow-[0_18px_36px_rgba(32,28,24,0.08)] backdrop-blur-xl md:px-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] muted-copy">Capture</p>
          <label className="mt-2 block text-2xl font-semibold" htmlFor="task-composer">
            Add task
          </label>
        </div>
        <p className="text-sm muted-copy">Enter adds. One line per task.</p>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
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
          placeholder="One task per line."
          className="max-h-40 min-h-[4rem] w-full resize-none rounded-[1.6rem] border border-[rgba(var(--border),0.56)] bg-[rgba(var(--surface),0.99)] px-4 py-4 text-[15px] leading-6 text-[rgb(var(--text))] placeholder:text-[rgba(var(--text),0.5)] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-[1.6rem] px-6 text-sm font-semibold text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: "rgb(var(--accent))" }}
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="pill-surface inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-[rgba(var(--surface),0.96)]"
        >
          <FolderPlus className="h-4 w-4" />
          More fields
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {hasDetails ? (
          <p className="text-sm muted-copy">Applies to every task added here.</p>
        ) : null}
      </div>

      {showDetails || hasDetails ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium">
              <FolderPlus className="h-4 w-4" />
              Category
            </span>
            <input
              list={categoryListId}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category"
              className="w-full rounded-[1.2rem] border border-[rgba(var(--border),0.52)] bg-[rgba(var(--surface),0.99)] px-4 py-3 text-sm focus:outline-none"
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
                      onClick={() => setCategory(option.label)}
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
            <span className="mb-2 flex items-center gap-2 text-sm font-medium">
              <StickyNote className="h-4 w-4" />
              Subnotes
            </span>
            <textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add one subnote per line."
              className="w-full resize-none rounded-[1.2rem] border border-[rgba(var(--border),0.52)] bg-[rgba(var(--surface),0.99)] px-4 py-3 text-sm leading-6 focus:outline-none"
            />
            <p className="mt-2 text-xs muted-copy">One line per subnote.</p>
          </label>
        </div>
      ) : null}
    </div>
  );
}
