import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { useAppStore } from "@/state/appStore";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/components/shared/PriorityBadge";

type Props = {
  boardId: string;
  onOpenDetail?: (taskId: string) => void;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function CalendarView({ boardId, onOpenDetail }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const tasks = useFilteredTasks(boardId);
  const updateTaskDetails = useAppStore((s) => s.updateTaskDetails);

  // Index tasks by due date
  const tasksByDate = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const existing = tasksByDate.get(task.dueDate) ?? [];
    tasksByDate.set(task.dueDate, [...existing, task]);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const todayStr = toLocalDateStr(today);

  // Fill cells: prev overflow + current month + next overflow
  type Cell = { dateStr: string; day: number; isCurrentMonth: boolean };
  const cells: Cell[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const date = new Date(year, month - 1, d);
    cells.push({ dateStr: toLocalDateStr(date), day: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ dateStr: toLocalDateStr(date), day: d, isCurrentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    cells.push({ dateStr: toLocalDateStr(date), day: d, isCurrentMonth: false });
  }

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Previous month"
          className="rounded-lg p-1.5 hover:bg-[rgb(var(--surface-muted))] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Next month"
          className="rounded-lg p-1.5 hover:bg-[rgb(var(--surface-muted))] transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid flex-shrink-0 grid-cols-7 border-b border-[rgb(var(--border))]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-[rgba(var(--border),0.4)]" style={{ minHeight: "120px" }}>
            {week.map((cell) => {
              const dayTasks = tasksByDate.get(cell.dateStr) ?? [];
              const isToday = cell.dateStr === todayStr;
              return (
                <div
                  key={cell.dateStr}
                  className={cn(
                    "border-r border-[rgba(var(--border),0.4)] p-1.5 last:border-r-0",
                    !cell.isCurrentMonth && "opacity-40",
                  )}
                >
                  <div className="mb-1 flex items-center justify-center">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday
                          ? "bg-[rgb(var(--accent))] text-white font-semibold"
                          : "text-[rgb(var(--text))]",
                      )}
                    >
                      {cell.day}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onOpenDetail?.(task.id)}
                        title={task.text}
                        className={cn(
                          "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs transition-colors hover:bg-[rgba(var(--accent),0.1)]",
                          task.completed && "opacity-50 line-through",
                        )}
                      >
                        {task.priority && (
                          <span className="flex-shrink-0">
                            <PriorityBadge priority={task.priority} compact />
                          </span>
                        )}
                        <span className="truncate">{task.text}</span>
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="block px-1 text-xs text-[rgb(var(--muted))]">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
