import { useEffect, useState } from "react";
import { MoonStar, PaintBucket, RefreshCcw, SunMedium, UserRound, X } from "lucide-react";
import type { AppMode, ThemePreference, UserSettings } from "@shared/types";
import { SYNC_CONFIG_COPY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/state/appStore";

type SettingsPanelProps = {
  open: boolean;
};

const themeOptions: Array<{ value: ThemePreference; label: string; icon: typeof SunMedium }> = [
  { value: "system", label: "System", icon: RefreshCcw },
  { value: "light", label: "Light", icon: SunMedium },
  { value: "dark", label: "Dark", icon: MoonStar },
];

const modeOptions: Array<{ value: AppMode; label: string }> = [
  { value: "local", label: "Local only" },
  { value: "cloud", label: "Synced" },
];

const accentOptions: Array<{ value: UserSettings["accentTheme"]; label: string }> = [
  { value: "sunrise", label: "Sunrise" },
  { value: "paper", label: "Paper" },
  { value: "midnight", label: "Midnight" },
];

export function SettingsPanel({ open }: SettingsPanelProps) {
  const closeSettings = useAppStore((store) => store.closeSettings);
  const settings = useAppStore((store) => store.settings);
  const updateSettings = useAppStore((store) => store.updateSettings);
  const clearCompleted = useAppStore((store) => store.clearCompleted);
  const switchMode = useAppStore((store) => store.switchMode);
  const updateProfileName = useAppStore((store) => store.updateProfileName);
  const signOut = useAppStore((store) => store.signOut);
  const auth = useAppStore((store) => store.auth);
  const remoteConfigured = useAppStore((store) => store.remoteConfigured);
  const mode = useAppStore((store) => store.mode);
  const [displayName, setDisplayName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(auth.profile?.name ?? "");
    setNameFeedback(null);
  }, [auth.profile?.name, auth.status, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  async function handleNameSave() {
    setIsSavingName(true);
    setNameFeedback(null);

    try {
      await updateProfileName(displayName);
      setNameFeedback("Name saved.");
    } catch (error) {
      setNameFeedback(error instanceof Error ? error.message : "Could not save name.");
    } finally {
      setIsSavingName(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 transition",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={closeSettings}
        aria-label="Close settings"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-hidden border-l bg-[rgba(var(--surface),0.97)] px-6 py-6 shadow-glass">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] muted-copy">Settings</p>
            <h2 className="mt-2 text-2xl font-semibold">Settings</h2>
          </div>
          <button
            type="button"
            onClick={closeSettings}
            className="rounded-2xl p-2 muted-copy transition hover:bg-[rgba(var(--surface-muted),0.9)] hover:text-[rgb(var(--text))]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pb-10 pr-1">
          <section className="soft-surface p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl accent-chip">
                <UserRound className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Account</p>
                <p className="text-sm muted-copy">
                  {auth.status === "signed-in" && auth.profile
                    ? `Signed in as ${auth.profile.email}`
                    : "Use local mode or sign in to sync."}
                </p>
              </div>
            </div>

            {!remoteConfigured ? (
              <div className="mt-4 rounded-2xl border border-dashed hairline px-4 py-3 text-sm muted-copy">
                {SYNC_CONFIG_COPY}
              </div>
            ) : null}

            {auth.status === "signed-in" && auth.profile ? (
              <div className="mt-4 rounded-2xl border hairline px-4 py-4">
                <label className="block">
                  <span className="text-sm font-medium">Display name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    className="mt-3 w-full rounded-2xl border border-[rgba(var(--border),0.5)] bg-[rgba(var(--surface),0.96)] px-4 py-3 text-sm focus:outline-none"
                  />
                </label>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleNameSave()}
                    disabled={isSavingName}
                    className="rounded-2xl px-4 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: "rgb(var(--accent))" }}
                  >
                    {isSavingName ? "Saving..." : "Save name"}
                  </button>
                  <p className="text-sm muted-copy">Shown in the greeting.</p>
                </div>
                {nameFeedback ? <p className="mt-3 text-sm muted-copy">{nameFeedback}</p> : null}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              {modeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void switchMode(option.value)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm font-medium transition",
                    mode === option.value
                      ? "border-transparent text-white"
                      : "hairline bg-transparent muted-copy hover:text-[rgb(var(--text))]",
                  )}
                  style={mode === option.value ? { backgroundColor: "rgb(var(--accent))" } : undefined}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {auth.status === "signed-in" ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-4 rounded-2xl border hairline px-4 py-3 text-sm font-medium transition hover:bg-[rgba(var(--surface-muted),0.9)]"
              >
                Sign out
              </button>
            ) : null}
          </section>

          <section className="soft-surface p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl accent-chip">
                <PaintBucket className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Appearance</p>
                <p className="text-sm muted-copy">Theme and accent.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void updateSettings({ theme: option.value })}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                      settings.theme === option.value ? "border-transparent" : "hairline",
                    )}
                    style={
                      settings.theme === option.value
                        ? { backgroundColor: "rgba(var(--accent-soft),0.65)" }
                        : undefined
                    }
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </span>
                    <span className="text-sm muted-copy">{settings.theme === option.value ? "Active" : ""}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {accentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void updateSettings({ accentTheme: option.value })}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-sm font-medium transition",
                    settings.accentTheme === option.value ? "border-transparent" : "hairline",
                  )}
                  style={
                    settings.accentTheme === option.value
                      ? { backgroundColor: "rgba(var(--accent-soft),0.8)" }
                      : undefined
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="soft-surface p-4">
            <p className="font-medium">Behavior</p>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border hairline px-4 py-3">
              <div>
                <p className="text-sm font-medium">Collapse completed by default</p>
                <p className="text-sm muted-copy">Hide done tasks by default.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void updateSettings({
                    completedSectionCollapsed: !settings.completedSectionCollapsed,
                    showCompletedByDefault: settings.completedSectionCollapsed,
                  })
                }
                className={cn(
                  "h-8 w-14 rounded-full p-1 transition",
                  settings.completedSectionCollapsed ? "bg-[rgba(var(--accent),0.95)]" : "bg-[rgba(var(--border),0.95)]",
                )}
              >
                <span
                  className={cn(
                    "block h-6 w-6 rounded-full bg-white transition",
                    settings.completedSectionCollapsed ? "translate-x-6" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void clearCompleted()}
              className="mt-4 rounded-2xl border hairline px-4 py-3 text-sm font-medium transition hover:bg-[rgba(var(--surface-muted),0.9)]"
            >
              Clear completed tasks
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
}
