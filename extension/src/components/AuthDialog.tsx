import { useEffect, useState } from "react";
import { ArrowLeft, Mail, ShieldCheck, X } from "lucide-react";
import { useAppStore } from "@/state/appStore";

type AuthDialogProps = {
  open: boolean;
};

export function AuthDialog({ open }: AuthDialogProps) {
  const closeAuthDialog = useAppStore((store) => store.closeAuthDialog);
  const resetAuthFlow = useAppStore((store) => store.resetAuthFlow);
  const sendMagicCode = useAppStore((store) => store.sendMagicCode);
  const verifyMagicCode = useAppStore((store) => store.verifyMagicCode);
  const auth = useAppStore((store) => store.auth);
  const remoteConfigured = useAppStore((store) => store.remoteConfigured);
  const [email, setEmail] = useState(auth.profile?.email ?? "");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!auth.magicLinkPendingEmail && auth.profile?.email) {
      setEmail(auth.profile.email);
    }
  }, [auth.magicLinkPendingEmail, auth.profile?.email]);

  return (
    <div
      className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={closeAuthDialog}
        aria-label="Close account dialog"
      />
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 panel-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] muted-copy">Account sync</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {auth.magicLinkPendingEmail ? "Enter your verification code" : "Turn on cross-device sync"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeAuthDialog}
            className="rounded-2xl p-2 muted-copy transition hover:bg-[rgba(var(--surface-muted),0.9)] hover:text-[rgb(var(--text))]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!remoteConfigured ? (
          <div className="mt-5 rounded-3xl border border-dashed hairline px-4 py-4 text-sm muted-copy">
            Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `extension/.env.local`, then rebuild the extension.
          </div>
        ) : auth.magicLinkPendingEmail ? (
          <div className="mt-5">
            <div className="rounded-3xl bg-[rgba(var(--accent-soft),0.32)] px-4 py-4 text-sm">
              A code was sent to <span className="font-semibold">{auth.magicLinkPendingEmail}</span>.
            </div>
            <label className="mt-4 block text-sm font-medium" htmlFor="auth-token">
              6-digit code
            </label>
            <input
              id="auth-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="123456"
              className="mt-2 w-full rounded-2xl border hairline bg-transparent px-4 py-3 text-lg tracking-[0.28em]"
            />
            {auth.lastError ? <p className="mt-3 text-sm text-[rgb(var(--danger))]">{auth.lastError}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  resetAuthFlow();
                  setToken("");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border hairline px-4 py-3 text-sm font-medium transition hover:bg-[rgba(var(--surface-muted),0.9)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Use another email
              </button>
              <button
                type="button"
                onClick={() => void verifyMagicCode(auth.magicLinkPendingEmail ?? email, token)}
                className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: "rgb(var(--accent))" }}
              >
                Verify and continue
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="rounded-3xl bg-[rgba(var(--accent-soft),0.32)] px-4 py-4 text-sm muted-copy">
              Use email OTP for the most extension-friendly auth flow. Google sign-in can be layered in later on a hosted page if you want it.
            </div>
            <label className="block text-sm font-medium" htmlFor="auth-email">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 muted-copy" />
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@williamwu.ca"
                className="w-full rounded-2xl border hairline bg-transparent py-3 pl-11 pr-4"
              />
            </div>
            {auth.lastError ? <p className="text-sm text-[rgb(var(--danger))]">{auth.lastError}</p> : null}
            <button
              type="button"
              onClick={() => void sendMagicCode(email)}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: "rgb(var(--accent))" }}
            >
              <ShieldCheck className="h-4 w-4" />
              Send verification code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

