import { useEffect } from "react";
import { AlertTriangle, Undo2, X } from "lucide-react";
import { useAppStore, type ToastItem } from "@/state/appStore";

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismissToast = useAppStore((store) => store.dismissToast);
  const triggerToastAction = useAppStore((store) => store.triggerToastAction);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => dismissToast(toast.id), 6500);
    return () => window.clearTimeout(timeoutId);
  }, [dismissToast, toast.id]);

  return (
    <div className="panel-surface max-w-sm p-4">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor:
              toast.tone === "error" ? "rgba(var(--danger),0.18)" : "rgba(var(--accent-soft),0.82)",
          }}
        >
          {toast.tone === "error" ? <AlertTriangle className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{toast.title}</p>
          {toast.description ? <p className="mt-1 text-sm muted-copy">{toast.description}</p> : null}
          {toast.action.kind !== "none" && toast.actionLabel ? (
            <button
              type="button"
              onClick={() => void triggerToastAction(toast.id)}
              className="mt-3 rounded-2xl px-3 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "rgb(var(--accent))" }}
            >
              {toast.actionLabel}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="rounded-2xl p-2 muted-copy transition hover:bg-[rgba(var(--surface-muted),0.9)] hover:text-[rgb(var(--text))]"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useAppStore((store) => store.toasts);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastCard toast={toast} />
        </div>
      ))}
    </div>
  );
}

