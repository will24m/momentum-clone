import { useState } from "react";
import { useAppStore } from "@/state/appStore";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const boards = useAppStore((s) => s.boards).filter((b) => !b.deletedAt);
  const tasks = useAppStore((s) => s.tasks);
  const activeBoard = useAppStore((s) => s.activeBoard);
  const setActiveBoard = useAppStore((s) => s.setActiveBoard);
  const createBoard = useAppStore((s) => s.createBoard);
  const updateBoard = useAppStore((s) => s.updateBoard);
  const deleteBoard = useAppStore((s) => s.deleteBoard);

  const [newBoardName, setNewBoardName] = useState("");
  const [addingBoard, setAddingBoard] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  function taskCountForBoard(boardId: string) {
    return tasks.filter((t) => t.boardId === boardId && !t.deletedAt && !t.completed).length;
  }

  function handleCreateBoard() {
    const name = newBoardName.trim();
    if (!name) return;
    void createBoard(name);
    setNewBoardName("");
    setAddingBoard(false);
  }

  function handleRenameBoard(boardId: string) {
    const name = editDraft.trim();
    if (name) void updateBoard(boardId, { name });
    setEditingBoardId(null);
  }

  return (
    <nav
      className="flex w-56 flex-shrink-0 flex-col gap-1 border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 py-4"
      aria-label="Boards"
    >
      <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        Boards
      </p>

      {boards.sort((a, b) => a.order - b.order).map((board) => (
        <div key={board.id} className="relative">
          {editingBoardId === board.id ? (
            <input
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
              value={editDraft}
              autoFocus
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={() => handleRenameBoard(board.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameBoard(board.id);
                if (e.key === "Escape") setEditingBoardId(null);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setActiveBoard(board.id)}
              className={cn(
                "board-item flex w-full items-center justify-between text-sm",
                activeBoard === board.id
                  ? "active font-semibold text-[rgb(var(--accent))]"
                  : "text-[rgb(var(--text))]",
              )}
            >
              <span className="truncate">{board.name}</span>
              <span className="ml-1 flex-shrink-0 rounded-full bg-[rgb(var(--surface-muted))] px-1.5 py-0.5 text-xs text-[rgb(var(--muted))] tabular-nums">
                {taskCountForBoard(board.id)}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setMenuOpenId(menuOpenId === board.id ? null : board.id)
            }
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-[rgb(var(--muted))] opacity-0 group-hover:opacity-100 hover:text-[rgb(var(--text))] focus:opacity-100 focus:outline-none"
            aria-label="Board options"
          >
            ⋮
          </button>

          {menuOpenId === board.id && (
            <>
              <div
                className="fixed inset-0 z-20"
                aria-hidden="true"
                onClick={() => setMenuOpenId(null)}
              />
              <div className="absolute left-full top-0 z-30 ml-1 w-36 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-1 shadow-xl text-sm">
                <button
                  className="w-full px-3 py-1.5 text-left hover:bg-[rgb(var(--surface-muted))] transition-colors"
                  onClick={() => {
                    setEditDraft(board.name);
                    setEditingBoardId(board.id);
                    setMenuOpenId(null);
                  }}
                >
                  Rename
                </button>
                <hr className="my-1 border-[rgb(var(--border))]" />
                <button
                  className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => {
                    void deleteBoard(board.id);
                    setMenuOpenId(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {addingBoard ? (
        <div className="px-1">
          <input
            autoFocus
            className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
            placeholder="Board name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onBlur={() => {
              if (newBoardName.trim()) handleCreateBoard();
              else setAddingBoard(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateBoard();
              if (e.key === "Escape") { setAddingBoard(false); setNewBoardName(""); }
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingBoard(true)}
          className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--text))] transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New board
        </button>
      )}
    </nav>
  );
}
