"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ShieldAlert, Layers } from "lucide-react";

interface GateKeeperProps {
  children: React.ReactNode;
}

export function GateKeeper({ children }: GateKeeperProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [warned, setWarned] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const hasUnlocked = sessionStorage.getItem("ark_gate_unlocked") === "true";
    const hasWarned = sessionStorage.getItem("ark_gate_warned") === "true";
    if (hasUnlocked) setUnlocked(true);
    if (hasWarned) setWarned(true);
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = password.trim().toLowerCase();
    // Accept "arkitype", "preview", "design", "arkitype2026"
    if (["arkitype", "preview", "design", "arkitype2026"].includes(normalized)) {
      setUnlocked(true);
      setError(false);
      sessionStorage.setItem("ark_gate_unlocked", "true");
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleWarningAcknowledge = () => {
    setWarned(true);
    sessionStorage.setItem("ark_gate_warned", "true");
  };

  if (!isMounted) {
    return <div className="h-screen bg-[#070709]" />;
  }

  if (!unlocked) {
    return (
      <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#070709] font-sans text-white canvas-dotted">
        {/* Glow meshes */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              x: shake ? [-10, 10, -10, 10, 0] : 0 
            }}
            transition={{ duration: shake ? 0.4 : 0.6, type: "spring" }}
            className="z-10 w-full max-w-md p-6"
          >
            {/* Logo/Branding */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-md">
                <Layers className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Arkitype</h1>
              <p className="mt-2 text-sm text-zinc-400 font-medium">Design System Builder • Private Access</p>
            </div>

            {/* Lock Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Enter Workspace Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoFocus
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-4 pr-10 text-[14px] text-white placeholder:text-zinc-600 focus:border-white/30 focus:bg-white/10 focus:outline-none transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-xs font-medium text-rose-500"
                    >
                      Incorrect password. Please try again.
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-[14px] font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.98]"
                >
                  Enter Private Beta
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-zinc-500 font-medium">
              Password hint: <code className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-400">arkitype</code> or <code className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-400">preview</code>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (!warned) {
    return (
      <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#070709] font-sans text-white canvas-dotted">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="z-10 w-full max-w-lg p-6"
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-4 border-b border-white/10 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                  <ShieldAlert className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Developer Preview</h2>
                  <p className="text-xs text-zinc-400 font-medium">Please read before entering the studio</p>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-300">
                <p className="font-medium text-zinc-200">
                  Welcome to <strong className="text-white font-semibold">Arkitype</strong>. This is an early preview website shared for demonstration purposes only.
                </p>

                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4 text-[13px] text-amber-200/90 leading-relaxed font-medium">
                  <span className="font-bold text-amber-400 block mb-1">⚠️ Development Warning</span>
                  Arkitype is still under development and might be unstable, please use with caution.
                </div>

                <div className="space-y-2.5 rounded-2xl bg-white/[0.01] border border-white/5 p-4 text-[12px] text-zinc-400 font-medium">
                  <div className="flex items-start gap-2">
                    <span className="text-white">•</span>
                    <span>All changes are autosaved locally inside your active browser session.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white">•</span>
                    <span>Performance optimizations are running in developer beta modes.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white">•</span>
                    <span>The exported Figma variables bundle can be copied directly to the clipboard.</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={handleWarningAcknowledge}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-[14px] font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.98]"
                >
                  I Understand, Let's Build
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return <>{children}</>;
}
