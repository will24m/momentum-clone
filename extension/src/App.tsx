import { useEffect, useState } from "react";
import { CloudOff, FolderSync, Settings2, SlidersHorizontal } from "lucide-react";
import { AuthDialog } from "@/components/AuthDialog";
import { ImportDecisionDialog } from "@/components/ImportDecisionDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TaskComposer } from "@/components/TaskComposer";
import { TaskList } from "@/components/TaskList";
import { ToastViewport } from "@/components/ToastViewport";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { FilterBar } from "@/components/filters/FilterBar";
import { TaskDetailModal } from "@/components/detail/TaskDetailModal";
import { BulkActionBar } from "@/components/bulk/BulkActionBar";
import { BoardSettingsModal } from "@/components/board/BoardSettingsModal";
import { TableView } from "@/components/views/TableView";
import { CalendarView } from "@/components/views/CalendarView";
import { TimelineView } from "@/components/views/TimelineView";
import { OFFLINE_COPY, SYNC_CONFIG_COPY } from "@/lib/constants";
import { formatSyncTime, getGreeting } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useFilteredTasks } from "@/hooks/useFilteredTasks";
import { useAppStore } from "@/state/appStore";

const backgroundModules = import.meta.glob("../images/*.{jpg,jpeg,png,webp,avif,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const BACKGROUND_IMAGES = Object.values(backgroundModules).sort();

function pickRandomBackground() {
  if (!BACKGROUND_IMAGES.length) return null;
  return BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];
}

function getSyncLabel() {
  const { mode, remoteConfigured, sync, online, auth } = useAppStore.getState();
  if (mode === "local") return "Local only";
  if (!remoteConfigured) return "Sync unavailable";
  if (!online) return sync.queue.length > 0 ? "Changes saved locally" : "Offline";
  if (auth.status !== "signed-in") return "Sign in to sync";
  if (sync.health === "syncing") return "Syncing...";
  if (sync.health === "error") return "Saved locally";
  return "Synced";
}

function getSyncDetail() {
  const { mode, remoteConfigured, sync, online, auth } = useAppStore.getState();
  if (mode === "local") return "Saved on this device.";
  if (!remoteConfigured) return SYNC_CONFIG_COPY;
  if (!online) return OFFLINE_COPY;
  if (auth.status !== "signed-in") return "Sign in to sync.";
  if (sync.health === "error") return sync.lastError ?? "Saved here. Retry later.";
  return formatSyncTime(sync.lastSuccessfulSyncAt);
}

function Backdrop({ image }: { image: string | null }) {
  return (
    <div className="app-backdrop" aria-hidden="true">
      {image ? <div className="app-backdrop-image" style={{ backgroundImage: `url("${image}")` }} /> : null}
      <div className="app-backdrop-tint" />
      <div className="app-backdrop-glow" />
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="app-shell min-h-screen">
      <Backdrop image={BACKGROUND_IMAGES[0] ?? null} />
      <div className="relative flex min-h-screen flex-col">
        <div className="h-14 animate-pulse border-b border-[rgba(var(--border),0.4)] bg-[rgba(var(--surface),0.92)]" />
        <div className="flex flex-1">
          <div className="w-56 animate-pulse border-r border-[rgba(var(--border),0.4)] bg-[rgba(var(--surface),0.88)]" />
          <div className="flex-1 p-6">
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 w-72 animate-pulse rounded-2xl bg-[rgba(var(--surface),0.86)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({ boardId }: { boardId: string; onOpenDetail?: (taskId: string) => void }) {
  const columns = useAppStore((s) =>
    s.columns.filter((c) => c.boardId === boardId && !c.deletedAt).sort((a, b) => a.order - b.order),
  );
  const tasks = useFilteredTasks(boardId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapsed(colId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.columnId === col.id);
        const isCollapsed = collapsed.has(col.id);
        return (
          <div key={col.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCollapsed(col.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[rgb(var(--surface-muted))] transition-colors"
            >
              {col.color && (
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0 [background-color:var(--dot-color)]"
                  style={{ "--dot-color": col.color } as React.CSSProperties}
                />
              )}
              <span className="font-semibold flex-1">{col.name}</span>
              <span className="text-xs text-[rgb(var(--muted))]">{colTasks.length}</span>
              <svg
                className={cn("h-4 w-4 text-[rgb(var(--muted))] transition-transform", isCollapsed && "rotate-[-90deg]")}
                fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
            {!isCollapsed && (
              <div className="px-3 pb-3">
                <TaskList tasks={colTasks} columnId={col.id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


export default function App() {
  const initialize = useAppStore((store) => store.initialize);
  const hydrated = useAppStore((store) => store.hydrated);
  const auth = useAppStore((store) => store.auth);
  const sync = useAppStore((store) => store.sync);
  const mode = useAppStore((store) => store.mode);
  const remoteConfigured = useAppStore((store) => store.remoteConfigured);
  const welcomeDismissed = useAppStore((store) => store.welcomeDismissed);
  const composerFocusNonce = useAppStore((store) => store.composerFocusNonce);
  const focusComposer = useAppStore((store) => store.focusComposer);
  const addTasksFromInput = useAppStore((store) => store.addTasksFromInput);
  const openSettings = useAppStore((store) => store.openSettings);
  const openAuthDialog = useAppStore((store) => store.openAuthDialog);
  const showSettings = useAppStore((store) => store.showSettings);
  const showAuthDialog = useAppStore((store) => store.showAuthDialog);
  const importDecision = useAppStore((store) => store.importDecision);
  const activeBoard = useAppStore((store) => store.activeBoard);
  const activeView = useAppStore((store) => store.activeView);
  const boards = useAppStore((store) => store.boards).filter((b) => !b.deletedAt);
  const openBoardSettings = useAppStore((store) => store.openBoardSettings);

  const [backgroundImage] = useState<string | null>(() => pickRandomBackground());
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  useOnlineStatus();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        focusComposer();
        setShowComposer(true);
      }

      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        openSettings();
      }

      if (event.key === "Escape" && showComposer && !isTypingTarget) {
        setShowComposer(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusComposer, openSettings, showComposer]);

  if (!hydrated) {
    return <LoadingShell />;
  }

  const syncLabel = getSyncLabel();
  const syncDetail = getSyncDetail();
  const showSyncAction = remoteConfigured && (mode === "local" || auth.status !== "signed-in");

  const syncDotClass = !remoteConfigured
    ? "bg-[rgb(var(--muted))]"
    : mode === "local" || auth.status !== "signed-in"
      ? "bg-[rgb(var(--accent))] sync-pulse"
      : sync.health === "error"
        ? "bg-[rgb(var(--danger))] sync-pulse"
        : sync.health === "syncing"
          ? "bg-[rgb(var(--accent))] sync-pulse"
          : "bg-[rgb(var(--success))]";

  const activeBoardObj = boards.find((b) => b.id === activeBoard);

  return (
    <>
      <div className="app-shell flex min-h-screen flex-col">
        <Backdrop image={backgroundImage} />

        {/* Top bar */}
        <header className="topbar-glass relative z-10 flex h-14 flex-shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-wide">Momentum</span>
            <span className="hidden text-xs text-[rgb(var(--muted))] md:block">
              {getGreeting()} {auth.profile?.name ?? auth.profile?.email?.split("@")[0] ?? "there"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync status */}
            <div className="flex items-center gap-2 rounded-full border border-[rgba(var(--border),0.4)] bg-[rgba(var(--surface-muted),0.7)] px-3 py-1.5">
              <span className={cn("h-2 w-2 rounded-full flex-shrink-0", syncDotClass)} />
              <span className="text-xs font-medium">{syncLabel}</span>
              {sync.health === "offline" ? (
                <CloudOff className="h-3.5 w-3.5 text-[rgb(var(--muted))]" />
              ) : (
                <FolderSync className="h-3.5 w-3.5 text-[rgb(var(--muted))]" />
              )}
            </div>

            {showSyncAction && (
              <button
                type="button"
                onClick={openAuthDialog}
                className="rounded-full bg-[rgb(var(--accent))] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              onClick={openSettings}
              className="rounded-lg p-2 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--text))] transition-colors"
              aria-label="Open settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body: sidebar + main */}
        <div className="relative z-10 flex flex-1 overflow-hidden">
          <Sidebar />

          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Board header */}
            {activeBoardObj && (
              <div className="flex flex-shrink-0 items-center justify-between border-b border-[rgba(var(--border),0.4)] bg-[rgba(var(--surface),0.88)] px-4 py-2">
                <h1 className="text-base font-semibold">{activeBoardObj.name}</h1>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowComposer((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-1.5 text-xs font-medium hover:border-[rgb(var(--accent))] transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                    Add task
                  </button>
                  <button
                    type="button"
                    onClick={openBoardSettings}
                    aria-label="Board settings"
                    className="rounded-lg p-1.5 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--text))] transition-colors"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Task composer (slide down when open) */}
            {showComposer && activeBoard && (
              <div className="flex-shrink-0 border-b border-[rgba(var(--border),0.4)] bg-[rgba(var(--surface),0.92)] px-4 py-3">
                <TaskComposer
                  focusNonce={composerFocusNonce}
                  onSubmit={async (text) => {
                    await addTasksFromInput(text);
                    setShowComposer(false);
                  }}
                />
              </div>
            )}

            {/* Filter bar */}
            <FilterBar boardId={activeBoard} />

            {/* View container */}
            {activeBoard ? (
              <div className="view-fade-in flex flex-1 overflow-hidden">
                {activeView === "kanban" && (
                  <KanbanBoard boardId={activeBoard} onOpenDetail={setDetailTaskId} />
                )}
                {activeView === "list" && (
                  <ListView boardId={activeBoard} onOpenDetail={setDetailTaskId} />
                )}
                {activeView === "table" && (
                  <TableView boardId={activeBoard} onOpenDetail={setDetailTaskId} />
                )}
                {activeView === "calendar" && (
                  <CalendarView boardId={activeBoard} onOpenDetail={setDetailTaskId} />
                )}
                {activeView === "timeline" && (
                  <TimelineView boardId={activeBoard} onOpenDetail={setDetailTaskId} />
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-semibold">No board selected</p>
                  <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                    Create a board in the sidebar to get started.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      <BoardSettingsModal />
      <BulkActionBar />
      <WelcomeOverlay open={!welcomeDismissed} />
      <SettingsPanel open={showSettings} />
      <AuthDialog open={showAuthDialog} />
      <ImportDecisionDialog decision={importDecision} />
      <ToastViewport />
    </>
  );
}
