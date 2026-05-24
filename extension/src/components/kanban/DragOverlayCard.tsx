import type { TodoTask } from "@shared/types";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { DueDateBadge } from "@/components/shared/DueDateBadge";
import { LabelPill } from "@/components/shared/LabelPill";
import { useAppStore } from "@/state/appStore";

type Props = {
  task: TodoTask;
};

export function DragOverlayCard({ task }: Props) {
  const labels = useAppStore((s) => s.labels);
  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id));

  return (
    <div className="soft-surface rounded-xl border border-[rgb(var(--border))] px-4 py-3 shadow-2xl opacity-95 rotate-1 cursor-grabbing w-72">
      <p className="text-sm font-medium text-[rgb(var(--text))] leading-snug line-clamp-2">
        {task.text}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.priority && <PriorityBadge priority={task.priority} compact />}
        {task.dueDate && <DueDateBadge dueDate={task.dueDate} />}
        {taskLabels.map((l) => (
          <LabelPill key={l.id} name={l.name} color={l.color} />
        ))}
      </div>
    </div>
  );
}
