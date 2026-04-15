import { useEffect } from "react";
import { CloudOff, FolderSync, ListChecks, Settings2, Sparkles } from "lucide-react";
import { AuthDialog } from "@/components/AuthDialog";
import { ImportDecisionDialog } from "@/components/ImportDecisionDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TaskComposer } from "@/components/TaskComposer";
import { TaskList } from "@/components/TaskList";
import { TaskRow } from "@/components/TaskRow";
import { ToastViewport } from "@/components/ToastViewport";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { MOTIVATION_LINES, OFFLINE_COPY, SYNC_CONFIG_COPY } from "@/lib/constants";
import { formatHeaderDate, formatSyncTime, getGreeting } from "@/lib/dates";
import { partitionTasks, getTaskStats } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAppStore } from "@/state/appStore";

function getSyncLabel() {
  const { mode, remoteConfigured, sync, online, auth } = useAppStore.getState();

  if (mode === "local") {
    return "Local only";
  }

  if (!remoteConfigured) {
    return "Sync unavailable";
  }

  if (!online) {
    return sync.queue.length > 0 ? "Changes saved locally" : "Offline";
  }

  if (auth.status !== "signed-in") {
    return "Sign in to sync";
  }

  if (sync.health === "syncing") {
    return "Syncing...";
  }

  if (sync.health === "error") {
    return "Saved locally";
  }

  return "Synced";
}

function getSyncDetail() {
  const { mode, remoteConfigured, sync, online, auth } = useAppStore.getState();

  if (mode === "local") {
    return "Private on this device";
  }

  if (!remoteConfigured) {
    return SYNC_CONFIG_COPY;
  }

  if (!online) {
    return OFFLINE_COPY;
  }

  if (auth.status !== "signed-in") {
    return "Connect an account when you want the same list everywhere.";
  }

  if (sync.health === "error") {
    return sync.lastError ?? "We kept your latest changes locally and will retry.";
  }

  return formatSyncTime(sync.lastSuccessfulSyncAt);
}

function LoadingShell() {
  return (
    <div className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto max-w-7xl animate-fade-up">
        <div className="panel-surface p-8">
          <div className="h-8 w-48 animate-pulse rounded-full bg-[rgba(var(--surface-muted),0.95)]" />
          <div className="mt-8 grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-3xl bg-[rgba(var(--surface-muted),0.95)]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const initialize = useAppStore((store) => store.initialize);
  const hydrated = useAppStore((store) => store.hydrated);
  const tasks = useAppStore((store) => store.tasks);
  const settings = useAppStore((store) => store.settings);
  const mode = useAppStore((store) => store.mode);
  const auth = useAppStore((store) => store.auth);
  const sync = useAppStore((store) => store.sync);
  const remoteConfigured = useAppStore((store) => store.remoteConfigured);
  const welcomeDismissed = useAppStore((store) => store.welcomeDismissed);
  const composerFocusNonce = useAppStore((store) => store.composerFocusNonce);
  const focusComposer = useAppStore((store) => store.focusComposer);
  const addTasksFromInput = useAppStore((store) => store.addTasksFromInput);
  const toggleCompletedSection = useAppStore((store) => store.toggleCompletedSection);
  const openSettings = useAppStore((store) => store.openSettings);
  const openAuthDialog = useAppStore((store) => store.openAuthDialog);
  const showSettings = useAppStore((store) => store.showSettings);
  const showAuthDialog = useAppStore((store) => store.showAuthDialog);
  const importDecision = useAppStore((store) => store.importDecision);
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
      }

      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        openSettings();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusComposer, openSettings]);

  if (!hydrated) {
    return <LoadingShell />;
  }

  const { active, completed } = partitionTasks(tasks);
  const stats = getTaskStats(tasks);
  const motivation = MOTIVATION_LINES[new Date().getDate() % MOTIVATION_LINES.length];
  const syncLabel = getSyncLabel();
  const syncDetail = getSyncDetail();

  return (
    <>
      <div className="min-h-screen px-6 py-8 md:px-10">
        <div className="mx-auto max-w-7xl animate-fade-up">
          <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl accent-chip">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] muted-copy">Momentum Todo</p>
                <h1 className="text-xl font-semibold">
                  {getGreeting()} {auth.profile?.name ?? auth.profile?.email?.split("@")[0] ?? "there"}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="soft-surface px-4 py-3">
                <p className="text-sm font-semibold">{syncLabel}</p>
                <p className="mt-1 text-xs muted-copy">{syncDetail}</p>
              </div>
              {mode === "local" ? (
                <button
                  type="button"
                  onClick={openAuthDialog}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: "rgb(var(--accent))" }}
                >
                  Turn on sync
                </button>
              ) : null}
              <button
                type="button"
                onClick={openSettings}
                className="rounded-2xl border hairline bg-[rgba(var(--surface),0.74)] p-3 transition hover:bg-[rgba(var(--surface),0.96)]"
                aria-label="Open settings"
              >
                <Settings2 className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_22rem]">
            <main className="panel-surface p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] muted-copy">{formatHeaderDate()}</p>
                    <h2 className="mt-3 text-3xl font-semibold md:text-4xl">One excellent list for the day.</h2>
                  </div>
                  <div className="soft-surface flex items-center gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{stats.activeCount} active</p>
                      <p className="text-xs muted-copy">{stats.completedCount} completed</p>
                    </div>
                    <div className="h-10 w-px bg-[rgba(var(--border),0.6)]" />
                    <div>
                      <p className="text-sm font-semibold">{stats.completionRate}% done</p>
                      <p className="text-xs muted-copy">today's visible list</p>
                    </div>
                  </div>
                </div>

                <TaskComposer focusNonce={composerFocusNonce} onSubmit={addTasksFromInput} />

                {mode === "local" || !remoteConfigured ? (
                  <div className="soft-surface flex items-start gap-3 px-4 py-4 text-sm">
                    {sync.health === "offline" ? <CloudOff className="mt-0.5 h-4 w-4 shrink-0" /> : <FolderSync className="mt-0.5 h-4 w-4 shrink-0" />}
                    <div>
                      <p className="font-medium">
                        {mode === "local" ? "Local-first mode is active." : "Cloud sync is not configured yet."}
                      </p>
                      <p className="mt-1 muted-copy">
                        {mode === "local"
                          ? "Your tasks are already persistent on this device. Turn on sync when you want them everywhere."
                          : SYNC_CONFIG_COPY}
                      </p>
                    </div>
                  </div>
                ) : null}

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">Active tasks</p>
                      <p className="text-sm muted-copy">Drag to reorder. Click text to edit inline.</p>
                    </div>
                    <div className="rounded-full bg-[rgba(var(--surface-muted),0.9)] px-3 py-2 text-sm">
                      {active.length} ready
                    </div>
                  </div>
                  <TaskList tasks={active} />
                </section>

                <section className="soft-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => void toggleCompletedSection()}
                      className="inline-flex items-center gap-2 text-left"
                    >
                      <ListChecks className="h-4 w-4" />
                      <span className="font-semibold">Completed</span>
                      <span className="rounded-full bg-[rgba(var(--surface),0.9)] px-2 py-1 text-xs muted-copy">
                        {completed.length}
                      </span>
                    </button>
                    <p className="text-sm muted-copy">
                      {settings.completedSectionCollapsed ? "Hidden for focus" : "Visible for review"}
                    </p>
                  </div>

                  {!settings.completedSectionCollapsed && completed.length ? (
                    <div className="mt-4 space-y-3">
                      {completed.map((task) => (
                        <TaskRow key={task.id} task={task} />
                      ))}
                    </div>
                  ) : null}

                  {!settings.completedSectionCollapsed && !completed.length ? (
                    <p className="mt-4 text-sm muted-copy">Nothing finished yet. There’s room for a win.</p>
                  ) : null}
                </section>
              </div>
            </main>

            <aside className="space-y-6">
              <div className="panel-surface p-6">
                <p className="text-sm uppercase tracking-[0.24em] muted-copy">Today</p>
                <h3 className="mt-3 text-2xl font-semibold">{formatHeaderDate()}</h3>
                <p className="mt-4 text-base leading-7 muted-copy">{motivation}</p>
              </div>

              <div className="panel-surface p-6">
                <p className="text-sm uppercase tracking-[0.24em] muted-copy">Workspace health</p>
                <div className="mt-4 grid gap-3">
                  <div className="soft-surface p-4">
                    <p className="text-sm muted-copy">Mode</p>
                    <p className="mt-1 text-lg font-semibold">{mode === "cloud" ? "Synced workspace" : "Local workspace"}</p>
                  </div>
                  <div className="soft-surface p-4">
                    <p className="text-sm muted-copy">Pending changes</p>
                    <p className="mt-1 text-lg font-semibold">{sync.queue.length}</p>
                  </div>
                  <div className="soft-surface p-4">
                    <p className="text-sm muted-copy">Shortcut</p>
                    <p className="mt-1 text-lg font-semibold">Press `/` to focus the composer</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <WelcomeOverlay open={!welcomeDismissed} />
      <SettingsPanel open={showSettings} />
      <AuthDialog open={showAuthDialog} />
      <ImportDecisionDialog decision={importDecision} />
      <ToastViewport />
    </>
  );
}
