import type { TaskSize } from "@shared/types";
import { cn } from "@/lib/utils";

const SIZE_LABELS: Record<TaskSize, string> = {
  xs: "XS",
  sm: "S",
  md: "M",
  lg: "L",
  xl: "XL",
};

type Props = {
  size: TaskSize;
  className?: string;
};

export function SizeBadge({ size, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-1.5 py-0.5 text-xs font-semibold text-[rgb(var(--muted))] leading-none",
        className,
      )}
      title={`Size: ${size.toUpperCase()}`}
    >
      {SIZE_LABELS[size]}
    </span>
  );
}
