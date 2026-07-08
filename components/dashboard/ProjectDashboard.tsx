"use client";

import { useDesignSystem, ProjectState } from "@/store/useDesignSystem";
import { useState } from "react";
import { 
  Plus, 
  Folder, 
  Layers, 
  Flame, 
  Trash2, 
  Copy, 
  Edit3, 
  Search, 
  Grid, 
  List,
  LogOut,
  Sliders,
  Settings,
  HelpCircle,
  AlertTriangle,
  Check
} from "lucide-react";

export function ProjectDashboard() {
  const projects = useDesignSystem((s) => s.projects);
  const user = useDesignSystem((s) => s.user);
  const logout = useDesignSystem((s) => s.logout);
  const selectProject = useDesignSystem((s) => s.selectProject);
  const createProject = useDesignSystem((s) => s.createProject);
  const deleteProject = useDesignSystem((s) => s.deleteProject);
  const duplicateProject = useDesignSystem((s) => s.duplicateProject);
  const renameProject = useDesignSystem((s) => s.renameProject);

  const [search, setSearch] = useState("");
  const [isRenameId, setIsRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [isUpgraded, setIsUpgraded] = useState(false);

  const projectList = Object.values(projects || {}).sort((a, b) => b.updatedAt - a.updatedAt);
  const filteredProjects = projectList.filter((p) => 
    p?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    // Limit check if not upgraded
    if (projectList.length >= 3 && !isUpgraded) {
      setLimitModalOpen(true);
      return;
    }
    const name = `System Design ${projectList.length + 1}`;
    createProject(name);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projectList.length >= 3 && !isUpgraded) {
      setLimitModalOpen(true);
      return;
    }
    duplicateProject(id);
  };

  const handleRenameSubmit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim()) {
      renameProject(id, renameValue.trim());
    }
    setIsRenameId(null);
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-ink text-fg flex relative overflow-hidden">
      {/* Ambient Grid Layout Background */}
      <div className="absolute inset-0 canvas-dotted pointer-events-none opacity-20" />

      {/* Left Sidebar Menu */}
      <aside className="w-56 border-r border-line bg-ink-dark/60 backdrop-blur-md flex flex-col justify-between p-4 relative z-10 shrink-0 select-none">
        <div className="flex flex-col gap-6">
          {/* Brand header */}
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md">
              <Layers size={13} />
            </div>
            <span className="font-display font-bold tracking-tight text-[15.5px] text-white">Arkitype Hub</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 text-xs">
            <button className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 font-semibold text-fg transition-all text-left">
              <Folder size={14} className="text-indigo-400" />
              <span>All Design Files</span>
              <span className="ml-auto font-mono text-[10px] text-fg-mute bg-ink px-1.5 py-0.5 rounded border border-line/30">
                {projectList.length}
              </span>
            </button>

            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-fg-dim hover:bg-white/5 hover:text-fg transition-all text-left group"
            >
              <Flame size={14} className="text-pink-400 group-hover:animate-pulse" />
              <span>Upgrade Pro</span>
              {isUpgraded && (
                <span className="ml-auto text-[9px] uppercase bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded font-extrabold tracking-wider">
                  Pro
                </span>
              )}
            </button>

            <button className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-fg-dim hover:bg-white/5 hover:text-fg transition-all text-left">
              <Settings size={14} className="text-fg-mute" />
              <span>Workspace Settings</span>
            </button>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-line/50 pt-4 flex flex-col gap-3">
          {isUpgraded ? (
            <div className="rounded-lg bg-gradient-to-r from-pink-500/10 to-indigo-500/10 border border-indigo-500/30 p-2.5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-pink-400">Pro Active</span>
                <span className="text-[9px] text-fg-mute leading-none mt-0.5">Unlimited Files Unlocked</span>
              </div>
              <Check size={14} className="text-pink-400 shrink-0" />
            </div>
          ) : (
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:brightness-110 p-2.5 text-center text-xs font-semibold text-white shadow-md active:scale-95 transition-all"
            >
              Upgrade Workspace
            </button>
          )}

          <div className="flex items-center gap-2.5 px-2 py-1 justify-between">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-fg leading-none">{user?.name || "Jane Doe"}</div>
              <div className="truncate text-[10px] text-fg-mute mt-1">{user?.email || "jane@company.com"}</div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout Account"
              className="shrink-0 p-1.5 rounded bg-ink border border-line hover:border-line-strong text-fg-mute hover:text-fg transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Files Grid */}
      <main className="flex-1 p-8 overflow-y-auto relative z-10 flex flex-col gap-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/60 pb-5">
          <div>
            <h1 className="text-2xl font-display font-black tracking-tight text-white">Design Files</h1>
            <p className="text-[11px] text-fg-mute mt-1 font-medium">Manage, clone, or create independent design systems libraries.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-mute" size={13} />
              <input
                type="text"
                placeholder="Search systems..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 rounded-lg border border-line bg-ink-light px-8 py-1.5 text-xs text-fg placeholder:text-fg-mute focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-fg hover:bg-white text-ink px-3 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus size={13} />
              <span>New File</span>
            </button>
          </div>
        </div>

        {/* Project List */}
        {filteredProjects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-line/80 rounded-2xl bg-ink-light/20">
            <Folder size={32} className="text-fg-mute mb-3 animate-pulse" />
            <h3 className="text-sm font-bold text-fg">No files found</h3>
            <p className="text-xs text-fg-mute mt-1 max-w-xs leading-normal">
              {search 
                ? "No files match your query. Try searching with another name." 
                : "Create a design file library to start designing primitives, semantics and layout components."}
            </p>
            {!search && (
              <button
                onClick={handleCreate}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-bold transition-all active:scale-95"
              >
                <Plus size={13} />
                <span>Create Design File</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((p) => {
              // Extract primary swatches for thumbnail view
              const brandFamily = p.primitives.colorFamilies?.find((f) => f.id === "brand");
              const brandSeed = brandFamily?.seed || "#8B5CF6";
              const secondaryFamily = p.primitives.colorFamilies?.find((f) => f.id === "secondary");
              const secondarySeed = secondaryFamily?.seed || "#06B6D4";

              const projectColors: string[] = [brandSeed, secondarySeed];
              // Extract some ramp colors if they exist
              const brandRamp = p.primitives.colors?.brand;
              if (brandRamp) {
                if (brandRamp[3]) projectColors.push(brandRamp[3]);
                if (brandRamp[6]) projectColors.push(brandRamp[6]);
              }
              const secondaryRamp = p.primitives.colors?.secondary;
              if (secondaryRamp) {
                if (secondaryRamp[4]) projectColors.push(secondaryRamp[4]);
              }
              // Pad to 5 colors
              while (projectColors.length < 5) {
                projectColors.push(projectColors.length % 2 === 0 ? "#1F1F23" : "#27272A");
              }
              const visibleColors = projectColors.slice(0, 5);

              const isRenaming = isRenameId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => selectProject(p.id)}
                  className="group rounded-xl border border-line/40 bg-zinc-950/40 hover:bg-zinc-900/60 hover:border-indigo-500/40 shadow-sm transition-all duration-300 cursor-pointer overflow-hidden relative flex flex-col justify-between min-h-[180px]"
                >
                  {/* File preview thumbnail header */}
                  <div className="h-32 bg-[#1C1C1E] border-b border-line/30 flex items-center justify-center relative overflow-hidden select-none">
                    {/* Dotted canvas background */}
                    <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40 pointer-events-none" />

                    {/* Figma Vector Selection Preview */}
                    <div className="relative flex items-center justify-center scale-90 origin-center z-10 transition-transform duration-300 group-hover:scale-95">
                      {/* Figma blue bounding box selection */}
                      <div className="border border-[#18A0FB] rounded-sm bg-[#18A0FB]/5 p-5 flex items-center justify-center relative min-w-[140px]">
                        
                        {/* Dynamic Button Component Inside */}
                        <div
                          style={{ backgroundColor: brandSeed, borderRadius: "5px" }}
                          className="h-8 px-4 flex items-center justify-center text-[10px] font-semibold tracking-tight text-white shadow-md border-t border-white/15 min-w-[100px] select-none"
                        >
                          Primary Button
                        </div>

                        {/* Bounding box title badge */}
                        <span className="absolute -top-4.5 left-0 bg-[#18A0FB] text-white font-mono text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm select-none">
                          button
                        </span>

                        {/* Figma corner selection coordinates */}
                        <span className="absolute -top-0.75 -left-0.75 h-1.5 w-1.5 bg-white border border-[#18A0FB]" />
                        <span className="absolute -top-0.75 -right-0.75 h-1.5 w-1.5 bg-white border border-[#18A0FB]" />
                        <span className="absolute -bottom-0.75 -left-0.75 h-1.5 w-1.5 bg-white border border-[#18A0FB]" />
                        <span className="absolute -bottom-0.75 -right-0.75 h-1.5 w-1.5 bg-white border border-[#18A0FB]" />
                      </div>
                    </div>

                    {/* Floating Hover Tools */}
                    <div className="absolute inset-0 bg-ink-dark/85 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2.5 transition-all z-20">
                      <button
                        title="Duplicate File"
                        onClick={(e) => handleDuplicate(p.id, e)}
                        className="p-1.5 rounded bg-ink border border-line hover:border-line-strong text-fg-mute hover:text-fg transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        title="Rename File"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRenameId(p.id);
                          setRenameValue(p.name);
                        }}
                        className="p-1.5 rounded bg-ink border border-line hover:border-line-strong text-fg-mute hover:text-fg transition-colors"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        title="Delete File"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                            deleteProject(p.id);
                          }
                        }}
                        className="p-1.5 rounded bg-ink border border-line-strong hover:bg-red-950/20 hover:border-red-500/50 text-fg-mute hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Info panel */}
                  <div className="p-3.5 flex items-center justify-between border-t border-line/20 bg-zinc-950/20">
                    {isRenaming ? (
                      <form 
                        onSubmit={(e) => handleRenameSubmit(p.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 w-full"
                      >
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          className="flex-1 rounded border border-indigo-500 bg-ink px-2 py-0.5 text-xs text-fg focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10.5px] font-bold"
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <div className="min-w-0 flex-1 pr-2">
                        <h3 className="text-xs font-semibold text-fg-dim truncate leading-tight group-hover:text-indigo-400 transition-colors">
                          {p.name}
                        </h3>
                        <span className="block text-[10px] text-fg-mute font-medium mt-0.5">
                          Edited {formatRelativeTime(p.updatedAt)}
                        </span>
                      </div>
                    )}

                    {/* Clean color swatches in Figma-style container */}
                    <div className="flex items-center gap-1 bg-zinc-900 border border-line/30 rounded-full px-2 py-1 shrink-0 shadow-sm">
                      {visibleColors.slice(0, 3).map((color, idx) => (
                        <span
                          key={idx}
                          className="h-2 w-2 rounded-full border border-black/45 shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Limit Modal */}
      {limitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink-dark/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-line bg-ink-light p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400">
                <AlertTriangle size={16} />
              </div>
              <div className="flex-1">
                <h3 className="text-[13.5px] font-bold text-white">Project Limit Reached</h3>
                <p className="text-xs text-fg-mute leading-normal mt-1.5">
                  Free tier accounts are restricted to 3 active design files. Upgrade your workspace to build unlimited projects.
                </p>
                <div className="rounded border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1.5 text-[10px] text-indigo-400 font-semibold leading-tight mt-3">
                  Promo Notice: Claim upgrading options below for free launch access today.
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => {
                      setIsUpgraded(true);
                      setLimitModalOpen(false);
                    }}
                    className="flex-1 text-center py-2 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Upgrade Free Pro
                  </button>
                  <button
                    onClick={() => setLimitModalOpen(false)}
                    className="px-3 py-2 rounded-lg border border-line hover:border-line-strong text-xs font-semibold text-fg-mute hover:text-fg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Showcase Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink-dark/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/40 bg-ink-light p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Glow */}
            <div className="absolute top-[-10%] right-[-10%] h-32 w-32 rounded-full bg-pink-500/10 blur-xl pointer-events-none" />
            
            <div className="flex flex-col gap-4 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-white shadow-lg">
                <Flame size={20} className="animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold text-white">Upgrade to Arkitype Pro</h3>
              <p className="text-xs text-fg-mute leading-relaxed max-w-sm mx-auto">
                Get unlimited design files, continuous tokens API delivery webhooks, team coordination settings, and export parameters.
              </p>

              <div className="rounded-xl border border-line bg-ink p-4 text-left flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs border-b border-line pb-2 mb-1">
                  <span className="font-bold text-fg">Pro Plan</span>
                  <span className="font-mono text-[10.5px] text-pink-400 font-bold">$0/mo (Usually $19)</span>
                </div>
                <ul className="flex flex-col gap-2 text-[11px] text-fg-dim">
                  <li className="flex items-center gap-2">
                    <Check size={12} className="text-pink-400" />
                    <span>Create unlimited design files</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={12} className="text-pink-400" />
                    <span>Deploy directly to tokens variables webhooks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={12} className="text-pink-400" />
                    <span>Advanced layout custom metrics</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => {
                    setIsUpgraded(true);
                    setShowUpgradeModal(false);
                  }}
                  className="flex-1 text-center py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:brightness-110 text-white text-xs font-bold shadow-lg transition-all active:scale-[0.98]"
                >
                  Claim Free Upgrade
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2.5 rounded-lg border border-line hover:border-line-strong text-xs font-semibold text-fg-mute hover:text-fg transition-colors"
                >
                  Keep Free Tier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
