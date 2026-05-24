import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KeyboardSensor, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { TodoTask } from "@shared/types";
import { TaskRow } from "@/components/TaskRow";
import { EMPTY_STATE_COPY } from "@/lib/constants";

type TaskListProps = {
  tasks: TodoTask[];
  columnId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenDetail?: (taskId: string) => void;
};

function SortableTaskRow({
  task,
  columnId,
  onOpenDetail,
}: {
  task: TodoTask;
  columnId?: string;
  onOpenDetail?: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task, columnId: columnId ?? task.columnId },
  });

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? "opacity-0" : undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
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

export function TaskList({
  tasks,
  columnId,
  emptyTitle,
  emptyDescription,
  onOpenDetail,
}: TaskListProps) {
  if (!tasks.length) {
    return (
      <div className="soft-surface px-6 py-10 text-center">
        <p className="text-lg font-medium">{emptyTitle ?? "Nothing on the list yet."}</p>
        <p className="mt-2 text-sm leading-6 muted-copy">{emptyDescription ?? EMPTY_STATE_COPY}</p>
      </div>
    );
  }

  return (
    <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
      <div className="task-stack space-y-3">
        {tasks.map((task) => (
          <SortableTaskRow
            key={task.id}
            task={task}
            columnId={columnId}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </SortableContext>
  );
}
