import { cn } from "@/lib/utils";

type Props = {
  name: string;
  color: string;
  onRemove?: () => void;
  className?: string;
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function LabelPill({ name, color, onRemove, className }: Props) {
  const rgb = hexToRgb(color);
  const bg = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)` : "rgba(148,163,184,0.15)";
  const border = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.4)` : "rgba(148,163,184,0.4)";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-none",
        className,
      )}
      style={{ backgroundColor: bg, borderColor: border, color }}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove label ${name}`}
          className="ml-0.5 rounded-full opacity-60 hover:opacity-100 focus:outline-none"
        >
          ×
        </button>
      )}
    </span>
  );
}
