"use client";

import { useDesignSystem } from "@/store/useDesignSystem";
import { supabase } from "@/lib/supabase/client";
import { BetaTag } from "@/components/ui/BetaTag";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Eye, EyeOff, ShieldAlert } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const BETA_ACK_KEY = "arkitype_beta_ack";

type AuthMode = "signin" | "register" | "forgot";

/** Blocks the sign-in/create-account form until the user explicitly accepts
 *  that this is unstable pre-release software. Shown once — acknowledgement
 *  is remembered in localStorage so returning users aren't nagged every visit. */
function BetaDisclaimer({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="min-h-screen bg-ink text-fg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center justify-center gap-2.5 text-center">
          <span className="font-serif text-3xl tracking-tight text-fg">Arkitype</span>
          <BetaTag />
        </div>

        <div className="rounded-2xl border border-line bg-ink-raised p-8 sm:p-9">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          </div>
          <h1 className="mt-5 font-serif text-2xl tracking-tight text-fg">Before you continue</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-dim">
            Arkitype is <span className="font-medium text-fg">unstable, pre-release software</span>.
            Bugs, breaking changes, and outright data loss — including full loss of a saved design
            file — are possible at any time.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fg-dim">
            Don&apos;t rely on it for anything you can&apos;t afford to lose. Export what matters
            often from the Ship step.
          </p>

          <button
            type="button"
            onClick={onAccept}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fg px-6 py-3.5 text-base font-medium text-ink transition-opacity hover:opacity-90"
          >
            I understand, continue
            <ArrowRight size={18} />
          </button>
        </div>

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

export function AuthAndSurvey() {
  const view = useDesignSystem((s) => s.view);
  const setView = useDesignSystem((s) => s.setView);
  const recovery = useDesignSystem((s) => s.recovery);
  const setRecovery = useDesignSystem((s) => s.setRecovery);
  const submitSurveyAction = useDesignSystem((s) => s.submitSurvey);

  // Defaults to false on both server and first client paint (no localStorage
  // access during render, so no hydration mismatch), then syncs once mounted.
  const [betaAck, setBetaAck] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(BETA_ACK_KEY) === "true") setBetaAck(true);
  }, []);
  const acceptBetaDisclaimer = () => {
    localStorage.setItem(BETA_ACK_KEY, "true");
    setBetaAck(true);
  };

  // Email + password auth states
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Survey States
  const [surveyStep, setSurveyStep] = useState(0);
  const [role, setRole] = useState("");
  const [useCase, setUseCase] = useState("");
  const [experience, setExperience] = useState("");
  const [teamSize, setTeamSize] = useState("");

  const emailValid = EMAIL_RE.test(email.trim());

  // Switch auth mode without carrying transient state (error, sent-state, password).
  const switchMode = (m: AuthMode) => {
    setMode(m);
    setAuthError("");
    setResetSent(false);
    setPassword("");
  };

  // Sign in with email + password.
  const handleSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!emailValid) { setAuthError("Please enter a valid email"); return; }
    if (!password) { setAuthError("Please enter your password"); return; }
    setAuthError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setAuthError(
        /invalid login credentials/i.test(error.message)
          ? "Incorrect email or password."
          : error.message
      );
      return;
    }
    // AuthProvider's SIGNED_IN handler hydrates the session and routes onward.
  };

  // Create an account with email + password. With email confirmation disabled in
  // Supabase the session is live immediately — NO confirmation email is sent —
  // and AuthProvider routes into the survey. That "no email" is the whole point.
  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!emailValid) { setAuthError("Please enter a valid email"); return; }
    if (password.length < MIN_PASSWORD) {
      setAuthError(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    setAuthError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: name.trim() ? { name: name.trim() } : undefined },
    });
    setLoading(false);
    if (error) {
      setAuthError(
        /already registered|already exists|user already/i.test(error.message)
          ? "That email is already registered — sign in instead."
          : error.message
      );
      return;
    }
    // Anti-enumeration: an existing confirmed email returns a user with no identities.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setAuthError("That email is already registered — sign in instead.");
      return;
    }
    if (!data.session) {
      // No session means "Confirm email" is still ON in Supabase — turn it OFF so
      // sign-up issues a session immediately with no email.
      setAuthError("Check your email to confirm your account, then sign in.");
      return;
    }
    // Session live → AuthProvider's SIGNED_IN handler routes into the survey.
  };

  // Email a password-reset link — the ONLY email this app sends. Clicking it
  // returns to this origin, where AuthProvider flips `recovery` on and we show
  // the set-a-new-password form.
  const handleForgot = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!emailValid) { setAuthError("Please enter a valid email"); return; }
    setAuthError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    setLoading(false);
    if (error) { setAuthError(error.message); return; }
    setResetSent(true);
  };

  // Set a new password after arriving via the reset link (recovery session live).
  const handleSetNewPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newPassword.length < MIN_PASSWORD) {
      setAuthError(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    setAuthError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { setAuthError(error.message); return; }
    // Session is already signed in; drop the flag and reload to a clean URL so
    // AuthProvider re-hydrates straight into the dashboard.
    setRecovery(false);
    if (typeof window !== "undefined") window.location.replace(window.location.origin);
  };

  const handleSurveySubmit = () => {
    if (!role || !useCase || !experience || !teamSize) {
      alert("Please answer all questions to unlock the dashboard!");
      return;
    }
    submitSurveyAction({ role, useCase, experience, teamSize });
  };

  // Shared option-button styling: monochrome, selected = solid fg outline.
  const optionClass = (selected: boolean) =>
    `rounded-lg border px-4 py-3.5 text-left text-sm transition-colors ${
      selected
        ? "border-fg bg-ink-hover text-fg font-medium"
        : "border-line-strong bg-ink-panel text-fg-dim hover:border-fg/40 hover:text-fg"
    }`;

  // ── Set a new password (arrived via the reset link) ──────────────────────
  if (recovery) {
    return (
      <div className="min-h-screen bg-ink text-fg flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-center gap-2.5 text-center">
            <span className="font-serif text-3xl tracking-tight text-fg">Arkitype</span>
            <BetaTag />
          </div>

          <div className="rounded-2xl border border-line bg-ink-raised p-8 sm:p-9">
            <h1 className="font-serif text-3xl tracking-tight text-fg">Set a new password</h1>
            <p className="mt-3 text-sm leading-relaxed text-fg-dim">
              Choose a new password for your account — you&apos;ll be signed in right after.
            </p>

            <form onSubmit={handleSetNewPassword} className="mt-7 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-password-input" className="text-sm font-medium text-fg-dim">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-line-strong bg-ink-panel px-4 py-3 pr-11 text-[15px] text-fg placeholder:text-fg-mute transition-colors focus:border-fg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-mute transition-colors hover:text-fg"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {authError && (
                <span role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                  {authError}
                </span>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fg px-6 py-3.5 text-base font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Set password & sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (view === "login" && !betaAck) {
    return <BetaDisclaimer onAccept={acceptBetaDisclaimer} />;
  }

  if (view === "login") {
    const isForgot = mode === "forgot";
    const isRegister = mode === "register";
    return (
      <div className="min-h-screen bg-ink text-fg flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Wordmark */}
          <div className="mb-10 flex items-center justify-center gap-2.5 text-center">
            <span className="font-serif text-3xl tracking-tight text-fg">Arkitype</span>
            <BetaTag />
          </div>

          <div className="rounded-2xl border border-line bg-ink-raised p-8 sm:p-9">
            {isForgot && resetSent ? (
              /* ── Reset link sent ── */
              <>
                <h1 className="font-serif text-3xl tracking-tight text-fg">Check your email</h1>
                <p className="mt-3 text-sm leading-relaxed text-fg-dim">
                  We sent a password-reset link to{" "}
                  <span className="font-medium text-fg">{email}</span>. Click it to set a new
                  password.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="mt-7 inline-flex items-center justify-center gap-1.5 text-sm text-fg-mute transition-colors hover:text-fg"
                >
                  <ArrowLeft size={14} /> Back to sign in
                </button>
              </>
            ) : isForgot ? (
              /* ── Forgot password ── */
              <>
                <h1 className="font-serif text-3xl tracking-tight text-fg">Reset password</h1>
                <p className="mt-3 text-sm leading-relaxed text-fg-dim">
                  Enter your account email and we&apos;ll send you a link to set a new password.
                </p>
                <form onSubmit={handleForgot} className="mt-7 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="email-input" className="text-sm font-medium text-fg-dim">
                      Email address
                    </label>
                    <input
                      id="email-input"
                      type="email"
                      placeholder="jane.doe@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      className="w-full rounded-lg border border-line-strong bg-ink-panel px-4 py-3 text-[15px] text-fg placeholder:text-fg-mute transition-colors focus:border-fg focus:outline-none"
                    />
                  </div>
                  {authError && (
                    <span role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                      {authError}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fg px-6 py-3.5 text-base font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? "Sending…" : "Email me a reset link"}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="mt-6 inline-flex items-center justify-center gap-1.5 text-sm text-fg-mute transition-colors hover:text-fg"
                >
                  <ArrowLeft size={14} /> Back to sign in
                </button>
              </>
            ) : (
              /* ── Sign in / Create account ── */
              <>
                <h1 className="font-serif text-3xl tracking-tight text-fg">
                  {isRegister ? "Create your account" : "Sign in"}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-fg-dim">
                  {isRegister
                    ? "Just an email and a password to get started."
                    : "Welcome back — sign in with your email and password."}
                </p>

                <form
                  onSubmit={isRegister ? handleRegister : handleSignIn}
                  className="mt-7 flex flex-col gap-4"
                >
                  {isRegister && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="name-input" className="text-sm font-medium text-fg-dim">
                        Name <span className="font-normal text-fg-mute">(optional)</span>
                      </label>
                      <input
                        id="name-input"
                        type="text"
                        placeholder="Jane Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border border-line-strong bg-ink-panel px-4 py-3 text-[15px] text-fg placeholder:text-fg-mute transition-colors focus:border-fg focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="email-input" className="text-sm font-medium text-fg-dim">
                      Email address
                    </label>
                    <input
                      id="email-input"
                      type="email"
                      placeholder="jane.doe@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus={!isRegister}
                      autoComplete="email"
                      className="w-full rounded-lg border border-line-strong bg-ink-panel px-4 py-3 text-[15px] text-fg placeholder:text-fg-mute transition-colors focus:border-fg focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="password-input" className="text-sm font-medium text-fg-dim">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password-input"
                        type={showPassword ? "text" : "password"}
                        placeholder={isRegister ? "At least 8 characters" : "Your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={isRegister ? "new-password" : "current-password"}
                        className="w-full rounded-lg border border-line-strong bg-ink-panel px-4 py-3 pr-11 text-[15px] text-fg placeholder:text-fg-mute transition-colors focus:border-fg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-mute transition-colors hover:text-fg"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="-mt-1 self-end text-sm text-fg-mute transition-colors hover:text-fg"
                    >
                      Forgot password?
                    </button>
                  )}

                  {authError && (
                    <span role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                      {authError}
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fg px-6 py-3.5 text-base font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading
                      ? isRegister
                        ? "Creating…"
                        : "Signing in…"
                      : isRegister
                        ? "Create account"
                        : "Sign in"}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-fg-dim">
                  {isRegister ? "Already have an account? " : "New to Arkitype? "}
                  <button
                    type="button"
                    onClick={() => switchMode(isRegister ? "signin" : "register")}
                    className="font-medium text-fg transition-opacity hover:opacity-80"
                  >
                    {isRegister ? "Sign in" : "Create one"}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setView("landing")}
              className="text-sm text-fg-mute transition-colors hover:text-fg"
            >
              ← Back to landing
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Survey ──────────────────────────────────────────────────────────────
  if (view === "survey") {
    const questions = [
      {
        label: "Question 1 of 4",
        title: "What is your primary role?",
        grid: true,
        value: role,
        set: setRole,
        options: [
          { label: "Product Designer", val: "Product Designer" },
          { label: "Developer", val: "Developer" },
          { label: "Design Engineer", val: "Design Engineer" },
          { label: "Product Manager", val: "Product Manager" },
          { label: "Design Ops", val: "Design Ops" },
          { label: "Other", val: "Other" },
        ],
      },
      {
        label: "Question 2 of 4",
        title: "Why are you using Arkitype today?",
        grid: false,
        value: useCase,
        set: setUseCase,
        options: [
          { label: "Build a new design system from scratch", val: "build-new" },
          { label: "Sync design tokens back into code variables", val: "sync-code" },
          { label: "Migrate static colours into semantic variables", val: "migrate-static" },
          { label: "Just exploring next-gen UI paradigms", val: "explore" },
        ],
      },
      {
        label: "Question 3 of 4",
        title: "How experienced are you with design tokens?",
        grid: false,
        value: experience,
        set: setExperience,
        options: [
          { label: "Beginner — new to variables and token structures", val: "beginner" },
          { label: "Intermediate — familiar with primitives and semantic tokens", val: "intermediate" },
          { label: "Expert — composite component tokens, multi-brand pipelines", val: "expert" },
        ],
      },
      {
        label: "Question 4 of 4",
        title: "What is your team or company size?",
        grid: true,
        value: teamSize,
        set: setTeamSize,
        options: [
          { label: "Just me (solo)", val: "solo" },
          { label: "2–10 people", val: "small" },
          { label: "11–50 people", val: "medium" },
          { label: "51+ people", val: "large" },
        ],
      },
    ];

    const q = questions[surveyStep];
    const canAdvance = !!q.value;

    return (
      <div className="min-h-screen bg-ink text-fg flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="font-serif text-2xl tracking-tight text-fg">Arkitype</span>
              <BetaTag />
            </div>
            <h1 className="mt-5 font-serif text-3xl tracking-tight text-fg">
              Set up your workspace
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-fg-dim">
              Four quick questions so we can tune the starting tokens and studio to
              your workflow.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-ink-raised p-8">
            {/* Progress */}
            <div className="mb-8 flex items-center gap-1.5">
              {questions.map((_, s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= surveyStep ? "bg-fg" : "bg-line"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-fg-mute">
              {q.label}
            </p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">{q.title}</h2>

            <div className={`mt-6 grid gap-2.5 ${q.grid ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
              {q.options.map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => q.set(opt.val)}
                  className={optionClass(q.value === opt.val)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
              <button
                disabled={surveyStep === 0}
                onClick={() => setSurveyStep((s) => s - 1)}
                className="text-sm font-medium text-fg-mute transition-colors hover:text-fg disabled:opacity-30"
              >
                Back
              </button>

              {surveyStep < questions.length - 1 ? (
                <button
                  disabled={!canAdvance}
                  onClick={() => setSurveyStep((s) => s + 1)}
                  className="rounded-lg bg-fg px-6 py-2.5 text-[15px] font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button
                  disabled={!canAdvance}
                  onClick={handleSurveySubmit}
                  className="rounded-lg bg-fg px-6 py-2.5 text-[15px] font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Enter Arkitype
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
