import { useEffect, useState } from "react";
import { CloudOff, FolderSync, ListChecks, Settings2 } from "lucide-react";
import { AuthDialog } from "@/components/AuthDialog";
import { ImportDecisionDialog } from "@/components/ImportDecisionDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TaskComposer } from "@/components/TaskComposer";
import { TaskList } from "@/components/TaskList";
import { TaskRow } from "@/components/TaskRow";
import { ToastViewport } from "@/components/ToastViewport";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { OFFLINE_COPY, SYNC_CONFIG_COPY } from "@/lib/constants";
import { formatHeaderDate, formatSyncTime, getGreeting } from "@/lib/dates";
import {
  cn,
  getCategoryAppearance,
  getCategoryOptions,
  getTaskStats,
  normalizeCategoryKey,
  partitionTasks,
} from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAppStore } from "@/state/appStore";

const backgroundModules = import.meta.glob("../images/*.{jpg,jpeg,png,webp,avif,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const BACKGROUND_IMAGES = Object.values(backgroundModules).sort();

function pickRandomBackground() {
  if (!BACKGROUND_IMAGES.length) {
    return null;
  }

  return BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];
}

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
    return "Saved on this device.";
  }

  if (!remoteConfigured) {
    return SYNC_CONFIG_COPY;
  }

  if (!online) {
    return OFFLINE_COPY;
  }

  if (auth.status !== "signed-in") {
    return "Sign in to sync.";
  }

  if (sync.health === "error") {
    return sync.lastError ?? "Saved here. Retry later.";
  }

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
      <div className="relative min-h-screen px-5 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-5xl animate-fade-up">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4">
              <div className="h-7 w-52 animate-pulse rounded-full bg-[rgba(var(--surface-muted),0.95)]" />
              <div className="h-16 w-full animate-pulse rounded-[2rem] bg-[rgba(var(--surface),0.9)]" />
              <div className="h-72 animate-pulse rounded-[2rem] bg-[rgba(var(--surface),0.86)]" />
            </div>
            <div className="hidden h-64 animate-pulse rounded-[2rem] bg-[rgba(var(--surface),0.82)] xl:block" />
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
  const [backgroundImage] = useState<string | null>(() => pickRandomBackground());
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);

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

  const categoryOptions = getCategoryOptions(tasks);

  useEffect(() => {
    if (selectedCategoryKey && !categoryOptions.some((option) => option.key === selectedCategoryKey)) {
      setSelectedCategoryKey(null);
    }
  }, [categoryOptions, selectedCategoryKey]);

  if (!hydrated) {
    return <LoadingShell />;
  }

  const selectedCategory = categoryOptions.find((option) => option.key === selectedCategoryKey) ?? null;
  const visibleTasks = selectedCategoryKey
    ? tasks.filter((task) => normalizeCategoryKey(task.category) === selectedCategoryKey)
    : tasks;
  const { active, completed } = partitionTasks(visibleTasks);
  const stats = getTaskStats(visibleTasks);
  const overallStats = getTaskStats(tasks);
  const syncLabel = getSyncLabel();
  const syncDetail = getSyncDetail();
  const showSyncCallout = mode === "local" || !remoteConfigured || auth.status !== "signed-in";
  const showSyncAction = remoteConfigured && (mode === "local" || auth.status !== "signed-in");
  const syncCalloutTitle = !remoteConfigured
    ? "Sync setup"
    : mode === "local"
      ? "Saved here"
      : "Sign in to sync";
  const syncCalloutBody = !remoteConfigured
    ? SYNC_CONFIG_COPY
    : mode === "local"
      ? "Turn on sync to use this list elsewhere."
      : "Sign in to sync this list.";
  const syncPanelCopy = showSyncCallout ? syncCalloutBody : syncDetail;
  const syncDotClass = !remoteConfigured
    ? "bg-[rgb(var(--muted))]"
    : mode === "local" || auth.status !== "signed-in"
      ? "bg-[rgb(var(--accent))] sync-pulse"
      : sync.health === "error"
        ? "bg-[rgb(var(--danger))] sync-pulse"
        : sync.health === "syncing"
          ? "bg-[rgb(var(--accent))] sync-pulse"
          : "bg-[rgb(var(--success))]";

  return (
    <>
      <div className="app-shell min-h-screen">
        <Backdrop image={backgroundImage} />

        <div className="relative min-h-screen px-5 py-6 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl animate-fade-up">
            <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="hero-surface max-w-2xl motion-rise px-4 py-4 md:px-5">
                <p className="text-sm uppercase tracking-[0.24em] muted-copy">Momentum Todo</p>
                <h1 className="mt-4 text-3xl font-semibold md:text-[3.4rem] md:leading-[1.02]">
                  {getGreeting()} {auth.profile?.name ?? auth.profile?.email?.split("@")[0] ?? "there"}
                </h1>
                <p className="mt-3 text-base leading-7 muted-copy md:text-lg">
                  One list. Next task.
                </p>
              </div>

              <div className="motion-rise-delayed flex items-center gap-3 self-start">
                <div className="pill-surface flex items-center gap-3 rounded-full px-4 py-3">
                  <span className={cn("h-2.5 w-2.5 rounded-full", syncDotClass)} />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] muted-copy">Sync</p>
                    <p className="mt-0.5 text-sm font-semibold">{syncLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openSettings}
                  className="pill-surface rounded-2xl p-3 transition hover:-translate-y-0.5 hover:bg-[rgba(var(--surface),0.96)]"
                  aria-label="Open settings"
                >
                  <Settings2 className="h-5 w-5" />
                </button>
              </div>
            </header>

            <main className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
              <div className="content-shell space-y-6 p-4 md:p-5">
                <section className="motion-rise-delayed">
                  <p className="text-sm uppercase tracking-[0.22em] muted-copy">{formatHeaderDate()}</p>
                  <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                      <h2 className="text-4xl font-semibold md:text-[4.1rem] md:leading-[0.98]">Today&apos;s list</h2>
                      <p className="mt-3 text-base leading-7 muted-copy">Do the next task.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="pill-surface rounded-full px-3 py-2 font-medium">
                        {stats.activeCount} active
                      </span>
                      <span className="pill-surface rounded-full px-3 py-2 font-medium">
                        {stats.completedCount} done
                      </span>
                      <span className="pill-surface rounded-full px-3 py-2 muted-copy">`/` to add</span>
                    </div>
                  </div>
                </section>

                <div className="motion-rise-late">
                  <TaskComposer focusNonce={composerFocusNonce} onSubmit={addTasksFromInput} />
                </div>

                {categoryOptions.length ? (
                  <section className="motion-rise-later">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">Filter</p>
                        <p className="text-sm muted-copy">
                          {selectedCategory ? `Filter: ${selectedCategory.label}` : "Filter by category."}
                        </p>
                      </div>
                      {selectedCategory ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryKey(null)}
                          className="pill-surface rounded-full px-3 py-2 text-sm font-medium transition hover:-translate-y-[1px]"
                        >
                          Clear filter
                        </button>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryKey(null)}
                        className="pill-surface inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition hover:-translate-y-[1px]"
                        style={{
                          boxShadow: selectedCategoryKey === null
                            ? "0 0 0 2px rgba(var(--accent),0.22)"
                            : undefined,
                        }}
                      >
                        <span>All categories</span>
                        <span className="rounded-full bg-[rgba(var(--surface-muted),0.88)] px-2 py-0.5 text-xs muted-copy">
                          {overallStats.activeCount + overallStats.completedCount}
                        </span>
                      </button>

                      {categoryOptions.map((option) => {
                        const appearance = getCategoryAppearance(option.label);
                        const isSelected = option.key === selectedCategoryKey;

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setSelectedCategoryKey(option.key)}
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition hover:-translate-y-[1px]"
                            style={{
                              backgroundColor: appearance.background,
                              borderColor: appearance.border,
                              color: appearance.text,
                              boxShadow: isSelected ? `0 0 0 2px ${appearance.border}` : "none",
                              opacity: isSelected ? 1 : 0.9,
                            }}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: appearance.accent }}
                            />
                            <span>{option.label}</span>
                            <span className="rounded-full bg-[rgba(255,255,255,0.56)] px-2 py-0.5 text-xs text-[rgba(29,25,22,0.86)]">
                              {option.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                <section className="motion-rise-later">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">Active tasks</p>
                      <p className="text-sm muted-copy">
                        {selectedCategory
                          ? `${selectedCategory.label} only. Drag to reorder. Click to edit.`
                          : "Drag to reorder. Click to edit."}
                      </p>
                    </div>
                    <span className="pill-surface rounded-full px-3 py-2 text-sm font-medium">
                      {active.length} in view
                    </span>
                  </div>
                  <TaskList
                    tasks={active}
                    emptyTitle={
                      selectedCategory ? `No active tasks in ${selectedCategory.label}.` : undefined
                    }
                    emptyDescription={
                      selectedCategory
                        ? "Pick another category or clear the filter."
                        : undefined
                    }
                  />
                </section>

                <section className="motion-rise-later border-t hairline pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => void toggleCompletedSection()}
                      className="inline-flex items-center gap-2 text-left"
                    >
                      <ListChecks className="h-4 w-4" />
                      <span className="font-semibold">Completed</span>
                      <span className="pill-surface rounded-full px-2 py-1 text-xs muted-copy">
                        {completed.length}
                      </span>
                    </button>
                    <p className="text-sm muted-copy">
                      {settings.completedSectionCollapsed ? "Hidden" : `${stats.completionRate}% complete`}
                    </p>
                  </div>

                  {!settings.completedSectionCollapsed && completed.length ? (
                    <div className="soft-surface mt-4 p-3">
                      <div className="space-y-2">
                        {completed.map((task) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!settings.completedSectionCollapsed && !completed.length ? (
                    <div className="soft-surface mt-4 px-5 py-5 text-sm leading-6 muted-copy">
                      {selectedCategory
                        ? `Nothing finished in ${selectedCategory.label} yet.`
                        : "No completed tasks yet."}
                    </div>
                  ) : null}
                </section>
              </div>

              <aside className="motion-rise-delayed space-y-4 xl:sticky xl:top-8">
                <section className="soft-surface p-5">
                  <p className="text-[11px] uppercase tracking-[0.24em] muted-copy">Summary</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm muted-copy">Active</p>
                      <p className="mt-1 text-2xl font-semibold">{stats.activeCount} active tasks</p>
                    </div>
                    <div className="border-t hairline pt-4">
                      <p className="text-sm muted-copy">Completed</p>
                      <p className="mt-1 text-2xl font-semibold">{stats.completedCount} done</p>
                    </div>
                    <div className="border-t hairline pt-4">
                      <p className="text-sm muted-copy">Progress</p>
                      <p className="mt-1 text-2xl font-semibold">{stats.completionRate}% complete</p>
                      <p className="mt-1 text-sm muted-copy">`/` focuses the input.</p>
                    </div>
                  </div>
                </section>

                <section className="soft-surface p-5">
                  <div className="flex items-start gap-3">
                    {sync.health === "offline" ? (
                      <CloudOff className="mt-1 h-4 w-4 shrink-0" />
                    ) : (
                      <FolderSync className="mt-1 h-4 w-4 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.24em] muted-copy">Sync</p>
                      <p className="mt-2 text-xl font-semibold">{syncLabel}</p>
                      <p className="mt-2 text-sm leading-6 muted-copy">{syncPanelCopy}</p>
                    </div>
                  </div>

                  {showSyncCallout ? (
                    <div className="soft-surface mt-4 px-4 py-3">
                      <p className="text-sm font-medium">{syncCalloutTitle}</p>
                    </div>
                  ) : null}

                  {showSyncAction ? (
                    <button
                      type="button"
                      onClick={openAuthDialog}
                      className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                      style={{ backgroundColor: "rgb(var(--accent))" }}
                    >
                      Turn on sync
                    </button>
                  ) : null}
                </section>
              </aside>
            </main>
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
