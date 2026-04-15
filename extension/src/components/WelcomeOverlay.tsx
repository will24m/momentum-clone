import { Cloud, LaptopMinimal, Sparkles } from "lucide-react";
import { useAppStore } from "@/state/appStore";

type WelcomeOverlayProps = {
  open: boolean;
};

export function WelcomeOverlay({ open }: WelcomeOverlayProps) {
  const dismissWelcome = useAppStore((store) => store.dismissWelcome);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(12,14,18,0.38)] px-4 backdrop-blur-sm">
      <div className="panel-surface max-w-3xl px-8 py-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl accent-chip">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="mt-6 text-sm uppercase tracking-[0.26em] muted-copy">New tab todo workspace</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">
          A calmer tab. One strong list. No friction.
        </h1>
        <p className="mt-4 max-w-2xl text-lg muted-copy">
          Open a new tab and land in a polished todo workspace that feels instant, editable, and trustworthy.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void dismissWelcome("local")}
            className="soft-surface p-5 text-left transition hover:translate-y-[-2px]"
          >
            <LaptopMinimal className="h-5 w-5" />
            <p className="mt-4 text-lg font-semibold">Continue locally</p>
            <p className="mt-2 text-sm muted-copy">
              Start immediately with private on-device storage and no setup.
            </p>
          </button>
          <button
            type="button"
            onClick={() => void dismissWelcome("cloud")}
            className="soft-surface p-5 text-left transition hover:translate-y-[-2px]"
          >
            <Cloud className="h-5 w-5" />
            <p className="mt-4 text-lg font-semibold">Sign in to sync</p>
            <p className="mt-2 text-sm muted-copy">
              Keep the same workspace across laptops and browsers using your account.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

