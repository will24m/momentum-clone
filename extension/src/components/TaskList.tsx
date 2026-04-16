import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { TodoTask } from "@shared/types";
import { TaskRow } from "@/components/TaskRow";
import { EMPTY_STATE_COPY } from "@/lib/constants";
import { useAppStore } from "@/state/appStore";

type TaskListProps = {
  tasks: TodoTask[];
  emptyTitle?: string;
  emptyDescription?: string;
};

function SortableTaskRow({ task }: { task: TodoTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
      }}
    >
      <TaskRow task={task} draggable dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

export function TaskList({ tasks, emptyTitle, emptyDescription }: TaskListProps) {
  const reorderActiveTasks = useAppStore((store) => store.reorderActiveTasks);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const previousIndex = tasks.findIndex((task) => task.id === active.id);
    const nextIndex = tasks.findIndex((task) => task.id === over.id);

    if (previousIndex === -1 || nextIndex === -1) {
      return;
    }

    const reordered = [...tasks];
    const [moved] = reordered.splice(previousIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    void reorderActiveTasks(reordered.map((task) => task.id));
  }

  if (!tasks.length) {
    return (
      <div className="soft-surface px-6 py-10 text-center">
        <p className="text-lg font-medium">{emptyTitle ?? "Nothing on the list yet."}</p>
        <p className="mt-2 text-sm leading-6 muted-copy">{emptyDescription ?? EMPTY_STATE_COPY}</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="task-stack space-y-3">
          {tasks.map((task) => (
            <SortableTaskRow key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
