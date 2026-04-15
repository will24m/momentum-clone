import { GitMerge, Layers3 } from "lucide-react";
import type { ImportDecisionState } from "@shared/types";
import { useAppStore } from "@/state/appStore";

type ImportDecisionDialogProps = {
  decision: ImportDecisionState | null;
};

export function ImportDecisionDialog({ decision }: ImportDecisionDialogProps) {
  const resolveImportDecision = useAppStore((store) => store.resolveImportDecision);

  if (!decision) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,14,18,0.38)] px-4 backdrop-blur-sm">
      <div className="panel-surface max-w-2xl p-6">
        <p className="text-sm uppercase tracking-[0.24em] muted-copy">Import decision</p>
        <h2 className="mt-3 text-3xl font-semibold">Local tasks are waiting. Cloud tasks already exist.</h2>
        <p className="mt-4 text-base muted-copy">
          Choose whether to merge both lists together or trust the cloud copy and replace what is currently on this device.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void resolveImportDecision("merge")}
            className="soft-surface p-5 text-left transition hover:translate-y-[-2px]"
          >
            <GitMerge className="h-5 w-5" />
            <p className="mt-4 text-lg font-semibold">Merge both lists</p>
            <p className="mt-2 text-sm muted-copy">
              Keep {decision.localTasks.length} local tasks and {decision.remoteTasks.length} cloud tasks together.
            </p>
          </button>
          <button
            type="button"
            onClick={() => void resolveImportDecision("cloud")}
            className="soft-surface p-5 text-left transition hover:translate-y-[-2px]"
          >
            <Layers3 className="h-5 w-5" />
            <p className="mt-4 text-lg font-semibold">Use cloud tasks only</p>
            <p className="mt-2 text-sm muted-copy">Replace the current device list with the synced workspace.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

