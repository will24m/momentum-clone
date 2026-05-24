import { cn } from "@/lib/utils";

type Props = {
  dueDate: string;
  className?: string;
};

function formatDueDate(iso: string): { label: string; overdue: boolean; today: boolean } {
  const now = new Date();
  const due = new Date(iso);

  // Compare date only (no time)
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDate.getTime() - nowDate.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return {
      label: diffDays === -1 ? "Yesterday" : `${Math.abs(diffDays)}d ago`,
      overdue: true,
      today: false,
    };
  }

  if (diffDays === 0) return { label: "Today", overdue: false, today: true };
  if (diffDays === 1) return { label: "Tomorrow", overdue: false, today: false };
  if (diffDays < 7) {
    return {
      label: dueDate.toLocaleDateString(undefined, { weekday: "short" }),
      overdue: false,
      today: false,
    };
  }

  return {
    label: dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overdue: false,
    today: false,
  };
}

export function DueDateBadge({ dueDate, className }: Props) {
  const { label, overdue, today } = formatDueDate(dueDate);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium leading-none",
        overdue && "border-red-200 bg-red-50 text-red-600",
        today && !overdue && "border-amber-200 bg-amber-50 text-amber-700",
        !overdue && !today && "border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]",
        className,
      )}
      title={`Due: ${new Date(dueDate).toLocaleDateString()}`}
    >
      <svg
        aria-hidden="true"
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 16 16"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="2" y="3" width="12" height="11" rx="1.5" />
        <path d="M5 1v4M11 1v4M2 7h12" />
      </svg>
      {label}
    </span>
  );
}
