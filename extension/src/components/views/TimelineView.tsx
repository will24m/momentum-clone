import { useMemo, useRef, useState } from "react";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { useAppStore } from "@/state/appStore";
import { cn } from "@/lib/utils";

type Props = {
  boardId: string;
  onOpenDetail?: (taskId: string) => void;
};

const DAY_WIDTH = 40; // px per day
const ROW_HEIGHT = 36;

function dateToNum(dateStr: string): number {
  return new Date(dateStr).getTime();
}

function numToDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return numToDateStr(d.getTime());
}

function daysBetween(a: string, b: string): number {
  return Math.round((dateToNum(b) - dateToNum(a)) / 86_400_000);
}

function formatShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TimelineView({ boardId, onOpenDetail }: Props) {
  const tasks = useFilteredTasks(boardId);
  const columns = useAppStore((s) =>
    s.columns
      .filter((c) => c.boardId === boardId && !c.deletedAt)
      .sort((a, b) => a.order - b.order),
  );

  // Only tasks that have at least a due date
  const scheduledTasks = tasks.filter((t) => t.dueDate);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (!scheduledTasks.length) {
      const today = numToDateStr(Date.now());
      return { minDate: today, maxDate: addDays(today, 30), totalDays: 31 };
    }
    const dates = scheduledTasks.flatMap((t) => [t.startDate, t.dueDate].filter(Boolean) as string[]);
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    const paddedMin = addDays(min, -3);
    const paddedMax = addDays(max, 5);
    return {
      minDate: paddedMin,
      maxDate: paddedMax,
      totalDays: daysBetween(paddedMin, paddedMax) + 1,
    };
  }, [scheduledTasks]);

  const colMap = new Map(columns.map((c) => [c.id, c]));
  const today = numToDateStr(Date.now());
  const todayOffset = Math.max(0, daysBetween(minDate, today));

  // Build header ticks (every 7 days)
  const ticks: { label: string; offset: number }[] = [];
  for (let i = 0; i < totalDays; i += 7) {
    ticks.push({ label: formatShort(addDays(minDate, i)), offset: i });
  }

  const totalWidth = totalDays * DAY_WIDTH;

  if (!scheduledTasks.length) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">No scheduled tasks</p>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            Add due dates to tasks to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-auto">
        {/* Row labels */}
        <div className="flex-shrink-0 w-48 border-r border-[rgb(var(--border))]">
          {/* Header spacer */}
          <div className="h-8 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]" />
          {columns.map((col) => {
            const colTasks = scheduledTasks.filter((t) => t.columnId === col.id);
            if (!colTasks.length) return null;
            return (
              <div key={col.id}>
                <div className="sticky left-0 flex items-center gap-2 border-b border-[rgba(var(--border),0.4)] bg-[rgba(var(--surface),0.96)] px-3 py-1">
                  {col.color && (
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0 [background-color:var(--col-color)]"
                      style={{ "--col-color": col.color } as React.CSSProperties}
                    />
                  )}
                  <span className="text-xs font-semibold">{col.name}</span>
                </div>
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center border-b border-[rgba(var(--border),0.3)] px-3"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <span className={cn("truncate text-xs", t.completed && "line-through opacity-50")}>
                      {t.text}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Gantt area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: totalWidth, minWidth: totalWidth }}>
            {/* Time axis */}
            <div
              className="sticky top-0 z-10 flex h-8 items-end border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
              style={{ width: totalWidth }}
            >
              {ticks.map((tick) => (
                <div
                  key={tick.offset}
                  className="absolute bottom-0 pb-1 text-xs text-[rgb(var(--muted))]"
                  style={{ left: tick.offset * DAY_WIDTH + 4 }}
                >
                  {tick.label}
                </div>
              ))}
              {/* Today line marker in header */}
              {todayOffset >= 0 && todayOffset < totalDays && (
                <div
                  className="absolute bottom-0 top-0 w-px bg-[rgb(var(--accent))] opacity-60"
                  style={{ left: todayOffset * DAY_WIDTH }}
                />
              )}
            </div>

            {/* Rows */}
            {columns.map((col) => {
              const colTasks = scheduledTasks.filter((t) => t.columnId === col.id);
              if (!colTasks.length) return null;
              return (
                <div key={col.id}>
                  {/* Column section header row (transparent spacer) */}
                  <div
                    className="border-b border-[rgba(var(--border),0.4)] bg-[rgba(var(--surface-muted),0.3)]"
                    style={{ height: 24, width: totalWidth }}
                  />
                  {colTasks.map((task) => {
                    const start = task.startDate ?? task.dueDate!;
                    const end = task.dueDate!;
                    const startOff = Math.max(0, daysBetween(minDate, start));
                    const durationDays = Math.max(1, daysBetween(start, end) + 1);
                    const barLeft = startOff * DAY_WIDTH;
                    const barWidth = durationDays * DAY_WIDTH - 4;

                    return (
                      <div
                        key={task.id}
                        className="relative border-b border-[rgba(var(--border),0.3)]"
                        style={{ height: ROW_HEIGHT, width: totalWidth }}
                      >
                        {/* Today vertical guide */}
                        {todayOffset >= 0 && todayOffset < totalDays && (
                          <div
                            className="absolute bottom-0 top-0 w-px bg-[rgb(var(--accent))] opacity-20"
                            style={{ left: todayOffset * DAY_WIDTH }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenDetail?.(task.id)}
                          title={task.text}
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 flex items-center rounded-full px-2 text-xs font-medium text-white transition-opacity hover:opacity-90 truncate",
                            task.completed && "opacity-50",
                          )}
                          style={{
                            left: barLeft + 2,
                            width: Math.max(barWidth, 32),
                            height: ROW_HEIGHT - 8,
                            backgroundColor: col.color ?? "rgb(var(--accent))",
                          }}
                        >
                          <span className="truncate">{task.text}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
