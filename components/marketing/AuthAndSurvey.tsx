"use client";

import { useDesignSystem } from "@/store/useDesignSystem";
import { supabase } from "@/lib/supabase/client";
import { useState } from "react";
import { Layers, ArrowRight, ArrowLeft, User, Mail, Compass, HelpCircle, Briefcase, Users, Zap } from "lucide-react";

export function AuthAndSurvey() {
  const view = useDesignSystem((s) => s.view);
  const setView = useDesignSystem((s) => s.setView);
  const submitSurveyAction = useDesignSystem((s) => s.submitSurvey);

  // Passwordless magic-link auth states
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Survey States
  const [surveyStep, setSurveyStep] = useState(0);
  const [role, setRole] = useState("");
  const [useCase, setUseCase] = useState("");
  const [experience, setExperience] = useState("");
  const [teamSize, setTeamSize] = useState("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Send a one-time sign-in link (creates the account if new). Works with
  // Supabase's default Magic Link email — no custom template needed. Clicking the
  // link returns to this origin, where AuthProvider consumes the session and routes.
  const handleSendMagicLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!emailValid) {
      setAuthError("Please enter a valid email");
      return;
    }
    setAuthError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: name.trim() ? { name: name.trim() } : undefined,
      },
    });
    setLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setLinkSent(true);
  };

  const handleSurveySubmit = () => {
    if (!role || !useCase || !experience || !teamSize) {
      alert("Please answer all questions to unlock the dashboard!");
      return;
    }
    submitSurveyAction({
      role,
      useCase,
      experience,
      teamSize,
    });
  };

  if (view === "login") {
    return (
      <div className="min-h-screen bg-ink text-fg flex items-center justify-center px-6 relative overflow-hidden">
        {/* Dotted Grid Background */}
        <div className="absolute inset-0 canvas-dotted pointer-events-none opacity-20" />

        {/* Ambient Gradient Glows */}
        <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-pink-500/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo Brand Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg mb-3">
              <Layers size={20} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {linkSent ? "Check your email" : "Sign in to Arkitype"}
            </h2>
            <p className="text-xs text-fg-mute mt-1.5 text-center max-w-xs">
              {linkSent ? (
                <>
                  We sent a sign-in link to{" "}
                  <span className="text-fg-dim font-medium">{email}</span>. Click it to finish signing in — no password needed.
                </>
              ) : (
                "Enter your email and we'll send a one-time sign-in link. New here? Your account is created automatically."
              )}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-line bg-ink-raised/80 p-7 shadow-2xl backdrop-blur-md">
            {!linkSent ? (
              <form onSubmit={handleSendMagicLink} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name-input" className="text-[11.5px] font-semibold text-fg-dim">
                    Name <span className="text-fg-mute font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-mute" size={14} />
                    <input
                      id="name-input"
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-line bg-ink px-9 py-2.5 text-xs text-fg placeholder:text-fg-mute focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email-input" className="text-[11.5px] font-semibold text-fg-dim">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-mute" size={14} />
                    <input
                      id="email-input"
                      type="email"
                      placeholder="jane.doe@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      aria-invalid={!!authError}
                      aria-describedby={authError ? "auth-error-msg" : undefined}
                      className="w-full rounded-lg border border-line bg-ink px-9 py-2.5 text-xs text-fg placeholder:text-fg-mute focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {authError && (
                  <span id="auth-error-msg" role="alert" className="text-[11px] text-red-600 dark:text-red-400 font-medium">{authError}</span>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 disabled:opacity-60 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? "Sending…" : "Email me a sign-in link"}
                  <ArrowRight size={13} />
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Mail size={22} />
                </div>
                <p className="text-xs text-fg-dim leading-relaxed">
                  Open the email from Arkitype and click <span className="font-semibold text-fg">Sign in</span>. Keep this tab open — it signs you in automatically once you do.
                </p>

                {authError && (
                  <span id="auth-error-msg" role="alert" className="text-[11px] text-red-600 dark:text-red-400 font-medium">{authError}</span>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSendMagicLink()}
                    className="w-full py-2.5 rounded-lg border border-line bg-ink hover:border-line-strong disabled:opacity-60 text-fg-dim font-semibold text-xs transition-all"
                  >
                    {loading ? "Resending…" : "Resend link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLinkSent(false); setAuthError(""); }}
                    className="text-[11px] text-fg-mute hover:text-fg transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={11} /> Use a different email
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => setView("landing")}
              className="text-xs text-fg-mute hover:text-fg transition-colors"
            >
              ← Back to landing page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Survey Screen View
  if (view === "survey") {
    return (
      <div className="min-h-screen bg-ink text-fg flex items-center justify-center px-6 relative overflow-hidden">
        {/* Dotted Grid Background */}
        <div className="absolute inset-0 canvas-dotted pointer-events-none opacity-20" />

        <div className="w-full max-w-lg relative z-10">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-white shadow-lg mb-3">
              <Compass size={20} className="animate-spin-slow" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Let's customize your workspace</h2>
            <p className="text-xs text-fg-mute mt-1.5 max-w-sm">
              Answer 4 quick questions to help us configure the tokens and studio components for your workflows.
            </p>
          </div>

          {/* Survey Card Wizard */}
          <div className="rounded-2xl border border-line bg-ink-raised/80 p-7 shadow-2xl backdrop-blur-md">
            {/* Step Indicators */}
            <div className="flex justify-between items-center gap-1.5 mb-8">
              {[0, 1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    s <= surveyStep ? "bg-gradient-to-r from-indigo-500 to-pink-500" : "bg-line/40"
                  }`} 
                />
              ))}
            </div>

            {/* Question 0: Role */}
            {surveyStep === 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Briefcase size={15} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Question 1 of 4</span>
                </div>
                <h3 className="text-base font-bold text-fg mb-2">What is your primary professional role?</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Product Designer",
                    "Developer",
                    "Design Engineer",
                    "Product Manager",
                    "Design Ops",
                    "Other"
                  ].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`py-3 px-4 rounded-xl border text-xs font-semibold text-left transition-all ${
                        role === r 
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                          : "border-line bg-ink hover:border-line-strong text-fg-dim"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Question 1: Use Case */}
            {surveyStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <HelpCircle size={15} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Question 2 of 4</span>
                </div>
                <h3 className="text-base font-bold text-fg mb-2">Why are you using Arkitype today?</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Build a new design system from scratch", val: "build-new" },
                    { label: "Sync design tokens back into code variables", val: "sync-code" },
                    { label: "Migrate static colors into semantic variables", val: "migrate-static" },
                    { label: "Just exploring next-gen UI paradigms", val: "explore" }
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => setUseCase(item.val)}
                      className={`py-3.5 px-4 rounded-xl border text-xs font-semibold text-left transition-all ${
                        useCase === item.val
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "border-line bg-ink hover:border-line-strong text-fg-dim"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Question 2: Experience */}
            {surveyStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Zap size={15} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Question 3 of 4</span>
                </div>
                <h3 className="text-base font-bold text-fg mb-2">How experienced are you with design tokens?</h3>
                <div className="flex flex-col gap-2.5">
                  {[
                    { title: "Beginner", desc: "Understand styles, new to variables and token structures", val: "beginner" },
                    { title: "Intermediate", desc: "Familiar with primitives and semantic tokens mapping", val: "intermediate" },
                    { title: "Expert", desc: "Build composite component tokens, manage multi-brand pipelines", val: "expert" }
                  ].map((exp) => (
                    <button
                      key={exp.val}
                      onClick={() => setExperience(exp.val)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        experience === exp.val
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-line bg-ink hover:border-line-strong"
                      }`}
                    >
                      <span className={`text-xs font-bold ${experience === exp.val ? "text-indigo-600 dark:text-indigo-400" : "text-fg"}`}>
                        {exp.title}
                      </span>
                      <span className="text-[11px] text-fg-mute leading-tight">{exp.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Question 3: Team Size */}
            {surveyStep === 3 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Users size={15} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Question 4 of 4</span>
                </div>
                <h3 className="text-base font-bold text-fg mb-2">What is your team or company size?</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Just Me (Solo)", val: "solo" },
                    { label: "2 - 10 people", val: "small" },
                    { label: "11 - 50 people", val: "medium" },
                    { label: "51+ people", val: "large" }
                  ].map((team) => (
                    <button
                      key={team.val}
                      onClick={() => setTeamSize(team.val)}
                      className={`py-3.5 px-4 rounded-xl border text-xs font-semibold text-left transition-all ${
                        teamSize === team.val
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "border-line bg-ink hover:border-line-strong text-fg-dim"
                      }`}
                    >
                      {team.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center mt-8 pt-5 border-t border-line/40">
              <button
                disabled={surveyStep === 0}
                onClick={() => setSurveyStep((s) => s - 1)}
                className="text-xs font-semibold text-fg-mute hover:text-fg disabled:opacity-30 transition-all"
              >
                Back
              </button>

              {surveyStep < 3 ? (
                <button
                  disabled={
                    (surveyStep === 0 && !role) ||
                    (surveyStep === 1 && !useCase) ||
                    (surveyStep === 2 && !experience)
                  }
                  onClick={() => setSurveyStep((s) => s + 1)}
                  className="rounded-lg bg-fg hover:opacity-90 text-ink font-bold text-xs px-4 py-2 transition-all disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button
                  disabled={!teamSize}
                  onClick={handleSurveySubmit}
                  className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:brightness-110 text-white font-bold text-xs px-5 py-2 shadow-lg transition-all active:scale-95 disabled:opacity-40"
                >
                  Complete Survey & Enter
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
