import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { TodoTask } from "@shared/types";
import { useAppStore } from "@/state/appStore";
import { useFilterStore } from "@/state/filterStore";
import { ColumnLane } from "@/components/kanban/ColumnLane";
import { DragOverlayCard } from "@/components/kanban/DragOverlayCard";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { groupTasksByColumn } from "@/lib/utils";

type Props = {
  boardId: string;
  onOpenDetail?: (taskId: string) => void;
};

export function KanbanBoard({ boardId, onOpenDetail }: Props) {
  const allColumns = useAppStore((s) => s.columns);
  const allTasks = useAppStore((s) => s.tasks);
  const reorderTasksInColumn = useAppStore((s) => s.reorderTasksInColumn);
  const moveTaskToColumn = useAppStore((s) => s.moveTaskToColumn);
  const createColumn = useAppStore((s) => s.createColumn);

  const filteredTasks = useFilteredTasks(boardId);

  const columns = allColumns
    .filter((c) => c.boardId === boardId && !c.deletedAt)
    .sort((a, b) => a.order - b.order);

  const tasksByColumn = groupTasksByColumn(filteredTasks);

  const [activeTask, setActiveTask] = useState<TodoTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    const task = active.data.current?.task as TodoTask | undefined;
    if (task) setActiveTask(task);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;

    const activeTaskId = active.id as string;
    const activeTask = allTasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;

    const overType = over.data.current?.type;
    const overColumnId: string | undefined =
      overType === "column"
        ? (over.data.current?.columnId as string)
        : (over.data.current?.columnId as string | undefined);

    if (!overColumnId || overColumnId === activeTask.columnId) return;

    // Optimistically show the task in the target column for UX feedback
    // The actual state update happens in handleDragEnd
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const activeTask = allTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overType = over.data.current?.type as string | undefined;
    const overColumnId: string =
      overType === "column"
        ? (over.data.current?.columnId as string)
        : (over.data.current?.columnId as string);

    if (!overColumnId) return;

    if (activeTask.columnId !== overColumnId) {
      // Cross-column move
      const colTasks = (tasksByColumn.get(overColumnId) ?? []);
      const newOrder = colTasks.length > 0
        ? Math.max(...colTasks.map((t) => t.order)) + 1000
        : 1000;
      void moveTaskToColumn(activeId, overColumnId, newOrder);
      return;
    }

    // Same-column reorder
    if (activeId === over.id) return;

    const colTasks = tasksByColumn.get(overColumnId) ?? [];
    const oldIndex = colTasks.findIndex((t) => t.id === activeId);
    const newIndex = colTasks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(colTasks, oldIndex, newIndex);
    void reorderTasksInColumn(overColumnId, reordered.map((t) => t.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 px-4 pb-4 pt-2 overflow-x-auto min-h-0 flex-1">
        {columns.map((col) => (
          <ColumnLane
            key={col.id}
            column={col}
            tasks={tasksByColumn.get(col.id) ?? []}
            onOpenDetail={onOpenDetail}
          />
        ))}

        {/* Add column button */}
        <button
          type="button"
          onClick={() => void createColumn(boardId, "New Column")}
          className="flex h-14 w-72 flex-shrink-0 items-center justify-center gap-2 self-start rounded-2xl border-2 border-dashed border-[rgb(var(--border))] text-sm text-[rgb(var(--muted))] hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add column
        </button>
      </div>

      <DragOverlay>
        {activeTask && <DragOverlayCard task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
