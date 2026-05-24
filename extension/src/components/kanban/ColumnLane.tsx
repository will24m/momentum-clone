import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column, TodoTask } from "@shared/types";
import { ColumnHeader } from "@/components/kanban/ColumnHeader";
import { TaskRow } from "@/components/TaskRow";
import { cn } from "@/lib/utils";

type SortableCardProps = {
  task: TodoTask;
  columnId: string;
  onOpenDetail?: (taskId: string) => void;
};

function SortableCard({ task, columnId, onOpenDetail }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task, columnId },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
    >
      <TaskRow
        task={task}
        draggable
        dragHandleProps={{ ...attributes, ...listeners }}
        onOpenDetail={onOpenDetail}
      />
    </div>
  );
}

type Props = {
  column: Column;
  tasks: TodoTask[];
  onOpenDetail?: (taskId: string) => void;
};

export function ColumnLane({ column, tasks, onOpenDetail }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const wipOver = column.wipLimit !== null && tasks.length > column.wipLimit;

  return (
    <div
      className={cn(
        "column-lane lane-enter flex w-72 flex-shrink-0 flex-col",
        isOver && "is-over",
        wipOver && "wip-over",
      )}
    >
      <ColumnHeader column={column} taskCount={tasks.length} />

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-3 pb-3"
        style={{ minHeight: 80 }}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="task-stack space-y-2">
            {tasks.map((task) => (
              <SortableCard
                key={task.id}
                task={task}
                columnId={column.id}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-[rgb(var(--muted))]">
            No tasks here
          </p>
        )}
      </div>
    </div>
  );
}
