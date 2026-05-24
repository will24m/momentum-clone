import type { TaskPriority } from "@shared/types";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; icon: string }
> = {
  critical: { label: "Critical", color: "text-red-600 bg-red-50 border-red-200", icon: "🔴" },
  high:     { label: "High",     color: "text-orange-600 bg-orange-50 border-orange-200", icon: "🟠" },
  medium:   { label: "Medium",   color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: "🟡" },
  low:      { label: "Low",      color: "text-blue-500 bg-blue-50 border-blue-200", icon: "🔵" },
};

type Props = {
  priority: TaskPriority;
  compact?: boolean;
  className?: string;
};

export function PriorityBadge({ priority, compact = false, className }: Props) {
  const cfg = PRIORITY_CONFIG[priority];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium leading-none",
        cfg.color,
        className,
      )}
      title={cfg.label}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      {!compact && <span>{cfg.label}</span>}
    </span>
  );
}

export function PRIORITY_OPTIONS(): { value: TaskPriority; label: string }[] {
  return [
    { value: "critical", label: "Critical" },
    { value: "high",     label: "High" },
    { value: "medium",   label: "Medium" },
    { value: "low",      label: "Low" },
  ];
}
