"use client";

/**
 * Full-screen password gate shown before sign-in/sign-up. The password is
 * verified server-side via /api/beta-gate — it never appears in client
 * code, so it can't be read by inspecting the bundle.
 */
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Lock } from "lucide-react";
import { BetaTag } from "@/components/ui/BetaTag";
import { trackEvent } from "@/lib/analytics";

const BETA_GATE_KEY = "ark_beta_gate_unlocked";

export function BetaGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || checking) return;
    setChecking(true);
    setError(false);
    try {
      const res = await fetch("/api/beta-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        sessionStorage.setItem(BETA_GATE_KEY, "true");
        trackEvent("beta_gate_unlock");
        onUnlock();
      } else {
        trackEvent("beta_gate_fail");
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-fg">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center justify-center gap-2.5 text-center">
          <span className="font-serif text-3xl tracking-tight text-fg">Arkitype</span>
          <BetaTag />
        </div>

        <div className="rounded-2xl border border-line bg-ink-raised p-8 sm:p-9">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong text-fg-dim">
            <Lock size={18} />
          </div>
          <h1 className="mt-5 font-serif text-2xl tracking-tight text-fg">Private alpha</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-dim">
            Arkitype is in a controlled alpha. Enter the access password to continue to sign in.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="beta-gate-password"
                className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-mute"
              >
                Access password
              </label>
              <div className="relative mt-2">
                <input
                  id="beta-gate-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="••••••••"
                  autoFocus
                  aria-invalid={error}
                  aria-describedby={error ? "beta-gate-error" : undefined}
                  className="h-11 w-full rounded-xl border border-line-strong bg-ink px-4 pr-10 text-[14px] text-fg placeholder:text-fg-mute focus:border-fg/40 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-mute transition-colors hover:text-fg"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && (
                <p id="beta-gate-error" role="alert" className="mt-2 text-xs font-medium text-rose-500">
                  Incorrect password. Please try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={checking}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-fg text-[14px] font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {checking ? "Checking…" : "Continue"}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-fg-mute">
          For password, please contact{" "}
          <a href="mailto:srinidhibhat45@gmail.com" className="text-fg-dim underline underline-offset-2 hover:text-fg">
            srinidhibhat45@gmail.com
          </a>
        </p>

        <div className="mt-6 text-center">
          <button
            onClick={() => (window.location.href = window.location.origin)}
            className="text-sm text-fg-mute transition-colors hover:text-fg"
          >
            ← Back to landing
          </button>
        </div>
      </div>
    </div>
  );
}

export function isBetaGateUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(BETA_GATE_KEY) === "true";
}
