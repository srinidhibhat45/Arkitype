"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDesignSystem } from "@/store/useDesignSystem";
import { 
  Layers, 
  ChevronRight, 
  Zap, 
  Sliders, 
  Palette, 
  Scaling, 
  Layout, 
  SlidersHorizontal,
  Activity,
  Code,
  Package,
  BookOpen,
  ArrowRight,
  Monitor,
  MousePointer,
  RotateCw,
  Folder,
  Globe,
  Play,
  Check,
  Search,
  Moon,
  Sun,
  HeartHandshake,
  ArrowUp,
  Plus,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  ExternalLink,
  Terminal,
  Cpu,
  FileCode,
  Info,
  Menu,
  X
} from "lucide-react";

export function LandingPage() {
  const setView = useDesignSystem((s) => s.setView);
  const user = useDesignSystem((s) => s.user);
  const chromeTheme = useDesignSystem((s) => s.chromeTheme);
  const toggleChromeTheme = useDesignSystem((s) => s.toggleChromeTheme);

  // States
  const [activeSection, setActiveSection] = useState("hero");
  const [hoveredNavIndex, setHoveredNavIndex] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sandbox variables that dynamically re-theme all mock cards on the page
  const [sandboxColor, setSandboxColor] = useState("#225BFF"); // Brand blue default
  const [sandboxDensity, setSandboxDensity] = useState(4); // padding scale multiplier
  const [sandboxRadius, setSandboxRadius] = useState(8); // corner radius px
  const [sandboxFont, setSandboxFont] = useState("font-sans");
  const [activeThemeTab, setActiveThemeTab] = useState("Shop"); // Shop, Studio, Inventory

  // Hover states for hero interactive buttons
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false);

  const navItems = [
    { label: "Product", target: "hero" },
    { label: "Showcase", target: "showcase" },
    { label: "Playground", target: "sandbox" },
    { label: "Features", target: "features" },
  ];

  const colorPresets = [
    { name: "Brand Blue", hex: "#225BFF" },
    { name: "Neon Cyan", hex: "#06B6D4" },
    { name: "Emerald Green", hex: "#10B981" },
    { name: "Amber Orange", hex: "#F59E0B" },
    { name: "Hot Rose", hex: "#F43F5E" },
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -y / (rect.height / 2) * 5;
    const rotateY = x / (rect.width / 2) * 5;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  // Close search with ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#070709] text-[#F4F4F5] font-sans antialiased overflow-x-hidden selection:bg-blue-500/30 selection:text-white pb-16 relative">
      
      {/* ────────────────────────────────────────────────────────────────────────
          CLASSY ROTATING MESH GRADIENT
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] opacity-20 animate-mesh-spin mix-blend-screen blur-[120px]">
          {/* Blue glow */}
          <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-r from-blue-600/30 to-indigo-600/20" />
          {/* Cyan/Emerald glow */}
          <div className="absolute top-[40%] right-[30%] w-[550px] h-[550px] rounded-full bg-gradient-to-r from-cyan-500/25 to-emerald-500/20" />
          {/* Magenta/Orange glow */}
          <div className="absolute bottom-[30%] left-[40%] w-[650px] h-[650px] rounded-full bg-gradient-to-r from-rose-500/20 to-amber-600/20" />
        </div>
        {/* Figma dotted grid overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.02)_1.2px,transparent_1.2px)] bg-[size:24px_24px] opacity-60" />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          THE MAGNETIC FLOATING NAV BAR
          ──────────────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
        <div className="flex items-center justify-between rounded-full bg-zinc-950/80 border border-white/10 backdrop-blur-xl px-4 py-2.5 shadow-2xl relative">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-tr from-zinc-700 to-zinc-950 border border-white/10 text-white font-black text-xs shadow-md">
              A
            </div>
            <span className="font-display font-black tracking-tight text-sm text-white uppercase">
              Arkitype
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 relative">
            {navItems.map((item, idx) => (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredNavIndex(idx)}
                onMouseLeave={() => setHoveredNavIndex(null)}
                className="relative"
              >
                <button
                  onClick={() => {
                    setActiveSection(item.target);
                    const element = document.getElementById(item.target);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className={`relative z-10 px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-colors duration-200 rounded-full ${
                    activeSection === item.target ? "text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>

                <AnimatePresence>
                  {hoveredNavIndex === idx && (
                    <motion.div
                      layoutId="activeNavBackground"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute inset-0 bg-white/5 rounded-full z-0 pointer-events-none"
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Search Button */}
            <button 
              onClick={() => setSearchOpen(true)}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              aria-label="Search site"
            >
              <Search size={15} />
            </button>

            {/* Dark mode switch */}
            <button 
              onClick={toggleChromeTheme}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              aria-label="Toggle theme mode"
            >
              {chromeTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Get started button */}
            <button
              onClick={() => {
                if (user) setView("dashboard");
                else setView("login");
              }}
              className="ml-2 rounded-full bg-white text-zinc-950 font-bold text-[10px] uppercase tracking-wider px-4 py-2 hover:bg-zinc-200 active:scale-95 transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Get Started
            </button>

            {/* Mobile menu toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-4 right-4 z-40 bg-zinc-950 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 shadow-2xl backdrop-blur-xl md:hidden"
          >
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setMobileMenuOpen(false);
                  const el = document.getElementById(item.target);
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg"
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────────────────
          HERO SECTION
          ──────────────────────────────────────────────────────────────────────── */}
      <section id="hero" className="relative max-w-7xl mx-auto px-6 pt-36 pb-12 text-center z-10">
        
        {/* Floating badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/35 bg-blue-950/20 text-blue-300 px-4 py-1.5 text-[11px] font-bold tracking-wide mb-8 hover:bg-blue-500/10 transition-all duration-300">
          <Layers size={13} className="text-blue-400" />
          <span>An open source design system that's fully customizable and agent ready</span>
        </div>

        {/* Heading title */}
        <h1 className="text-4.5xl sm:text-7xl font-display font-black tracking-tight text-white mb-6 max-w-5xl mx-auto leading-[1.05] selection:bg-blue-500/30">
          An open source design system that's<br />
          <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            fully customizable and agent ready
          </span>
        </h1>

        <p className="text-sm sm:text-[15px] text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-semibold">
          Scaffold projects, browse templates, generate themes, and get agent-ready docs from the command line or MCP.
        </p>

        {/* ────────────────────────────────────────────────────────────────────────
            TACTILE 3D BUTTONS
            ──────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-20 relative">
          
          {/* PRIMARY 3D CTA BUTTON */}
          <div className="relative w-full sm:w-auto">
            <button
              onMouseEnter={() => setIsPrimaryHovered(true)}
              onMouseLeave={() => setIsPrimaryHovered(false)}
              onClick={() => {
                if (user) setView("dashboard");
                else setView("login");
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-650 text-white font-black text-xs uppercase tracking-wider px-8 py-4.5 border-t border-white/20 shadow-[0_5px_0_#1E40AF,0_12px_24px_rgba(37,99,235,0.25)] hover:translate-y-[4px] hover:shadow-[0_1px_0_#1E40AF,0_4px_8px_rgba(37,99,235,0.25)] active:translate-y-[5px] active:shadow-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Get started
              <ChevronRight size={15} />
            </button>

            {/* Hover live preview */}
            <AnimatePresence>
              {isPrimaryHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15, x: "-50%" }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                  exit={{ opacity: 0, scale: 0.9, y: 15, x: "-50%" }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                  className="absolute bottom-full left-1/2 mb-5 w-80 bg-zinc-950/95 border border-white/10 backdrop-blur-xl p-5 rounded-2xl shadow-[0_20px_50px_rgba(37,99,235,0.15)] pointer-events-none z-30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                    <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase">Interactive Token Scale</span>
                  </div>
                  
                  {/* Token Tree nodes layout */}
                  <div className="bg-[#121215] border border-white/5 rounded-lg p-3 space-y-2.5 font-mono text-[9px] text-[#A1A1AA] text-left">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[#E4E4E7]">colors.brand.primary</span>
                      <span className="h-3 w-7 rounded-sm border border-black/45" style={{ backgroundColor: sandboxColor }} />
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[#E4E4E7]">spacing.padding.default</span>
                      <span className="text-zinc-300">{sandboxDensity * 4}px</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#E4E4E7]">radius.component.default</span>
                      <span className="text-zinc-300">{sandboxRadius}px</span>
                    </div>
                  </div>
                  <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-950 border-r border-b border-white/10 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECONDARY 3D CTA BUTTON */}
          <div className="relative w-full sm:w-auto">
            <button
              onMouseEnter={() => setIsSecondaryHovered(true)}
              onMouseLeave={() => setIsSecondaryHovered(false)}
              onClick={() => {
                const element = document.getElementById("sandbox");
                if (element) element.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-white font-bold text-xs uppercase tracking-wider px-8 py-4.5 shadow-[0_5px_0_#18181b,0_12px_24px_rgba(0,0,0,0.5)] hover:translate-y-[4px] hover:shadow-[0_1px_0_#18181b,0_4px_8px_rgba(0,0,0,0.5)] active:translate-y-[5px] active:shadow-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Browse components
            </button>

            {/* Hover live preview */}
            <AnimatePresence>
              {isSecondaryHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15, x: "-50%" }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                  exit={{ opacity: 0, scale: 0.9, y: 15, x: "-50%" }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                  className="absolute bottom-full left-1/2 mb-5 w-80 bg-zinc-950/95 border border-white/10 backdrop-blur-xl p-5 rounded-2xl shadow-[0_20px_50px_rgba(255,255,255,0.05)] pointer-events-none z-30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-ping" />
                    <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase">Framework Configuration</span>
                  </div>
                  
                  {/* Code block output */}
                  <div className="bg-[#121215] border border-white/5 rounded-lg p-3.5 font-mono text-[9px] text-[#A1A1AA] text-left space-y-1">
                    <p className="text-zinc-500">{"{"}</p>
                    <p className="pl-3">
                      <span className="text-blue-400">"theme"</span>:{" "}
                      <span className="text-emerald-400">"arkitype"</span>,
                    </p>
                    <p className="pl-3">
                      <span className="text-blue-400">"color-accent"</span>:{" "}
                      <span className="text-emerald-400">"{sandboxColor}"</span>,
                    </p>
                    <p className="pl-3">
                      <span className="text-blue-400">"font-face"</span>:{" "}
                      <span className="text-emerald-400">"{sandboxFont === "font-sans" ? "Instrument Sans" : "Space Grotesk"}"</span>
                    </p>
                    <p className="text-zinc-500">{"}"}</p>
                  </div>
                  <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-950 border-r border-b border-white/10 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        <p className="text-[11px] text-zinc-500 font-semibold tracking-wide uppercase mt-4">
          Currently in Beta · Built on <span className="text-zinc-350">React</span> and <span className="text-zinc-350">Tailwind CSS</span>
        </p>

      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          SHOWCASE GRID OF HIGH-FIDELITY MOCKUPS
          ──────────────────────────────────────────────────────────────────────── */}
      <section id="showcase" className="relative max-w-7xl mx-auto px-6 py-12 z-10 border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-display font-black text-white tracking-tight uppercase">
            A System of Themeable Components
          </h2>
          <p className="text-xs text-[#8E8E93] font-bold uppercase tracking-wider mt-1.5">
            Arkitype generates flexible structures that rebuild on the fly using variables.
          </p>
        </div>

        {/* Carousel/Tabs Theme Controller */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {["Shop", "Studio", "Inventory"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveThemeTab(t)}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                activeThemeTab === t 
                  ? "bg-zinc-800 border-white/20 text-white shadow-lg" 
                  : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:text-white"
              }`}
            >
              {t} Theme
            </button>
          ))}
        </div>

        {/* Responsive Grid representing the website dashboard preview mockup */}
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-300"
        >
          
          {/* Card 1: Watch card */}
          <div 
            style={{
              borderRadius: `${sandboxRadius}px`,
              padding: `${sandboxDensity * 4}px`,
            }}
            className="bg-zinc-950/70 border border-white/10 backdrop-blur-md flex flex-col justify-between h-[360px] group transition-all"
          >
            <div className="flex justify-between items-start">
              <span 
                style={{
                  borderRadius: `${sandboxRadius / 2}px`,
                  color: sandboxColor,
                  borderColor: `${sandboxColor}30`,
                }}
                className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 border bg-white/5"
              >
                Limited Edition
              </span>
              <span className="text-[10px] font-mono text-zinc-500 font-semibold">$248.00</span>
            </div>
            
            {/* watch SVG render */}
            <div className="flex-1 flex items-center justify-center my-4 relative">
              <div className="w-24 h-24 rounded-full border-2 border-zinc-850 flex items-center justify-center relative bg-zinc-900 shadow-inner group-hover:scale-105 transition-transform duration-300">
                {/* Watch hands */}
                <div className="absolute top-1/2 left-1/2 w-8 h-[2px] bg-zinc-400 origin-left" style={{ transform: "rotate(-30deg) translate(0, -1px)" }} />
                <div className="absolute top-1/2 left-1/2 w-10 h-[1.5px] bg-red-500 origin-left" style={{ transform: "rotate(110deg) translate(0, -1px)" }} />
                <div className="w-2 h-2 rounded-full bg-white z-10 shadow" />
                <span className="absolute top-2 text-[8px] font-mono text-zinc-650 font-bold">12</span>
                <span className="absolute bottom-2 text-[8px] font-mono text-zinc-655 font-bold">6</span>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <h3 className={`text-base font-display font-black text-white ${sandboxFont}`}>Minimalist watch</h3>
              <p className="text-xs text-zinc-405 leading-relaxed">Clean design, everyday durability.</p>
            </div>
          </div>

          {/* Card 2: Checkout card */}
          <div 
            style={{
              borderRadius: `${sandboxRadius}px`,
              padding: `${sandboxDensity * 4}px`,
            }}
            className="bg-zinc-950/70 border border-white/10 backdrop-blur-md flex flex-col justify-between h-[360px] text-left"
          >
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">Checkout Payment</h3>
              <div className="space-y-2">
                <input 
                  type="text" 
                  disabled 
                  placeholder="name@company.com" 
                  style={{ borderRadius: `${sandboxRadius / 2}px` }}
                  className="w-full bg-zinc-900 border border-white/5 px-3 py-2 text-xs text-zinc-400 placeholder:text-zinc-600"
                />
                
                {/* Options row */}
                <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono font-black uppercase text-center text-zinc-450">
                  <div className="py-2 border border-white/10 rounded bg-zinc-900 text-white cursor-pointer flex items-center justify-center gap-1">
                    <Check size={9} className="text-emerald-500" /> Card
                  </div>
                  <div className="py-2 border border-white/5 rounded hover:bg-white/5 cursor-pointer">Apple Pay</div>
                  <div className="py-2 border border-white/5 rounded hover:bg-white/5 cursor-pointer">Google Pay</div>
                </div>

                <input 
                  type="text" 
                  disabled 
                  placeholder="••••  ••••  ••••  4043" 
                  style={{ borderRadius: `${sandboxRadius / 2}px` }}
                  className="w-full bg-zinc-900 border border-white/5 px-3 py-2 text-xs text-zinc-400 placeholder:text-zinc-600"
                />
              </div>
            </div>

            <button
              style={{
                backgroundColor: sandboxColor,
                borderRadius: `${sandboxRadius}px`,
                padding: `${sandboxDensity * 2}px`,
              }}
              className="w-full text-center text-xs font-black uppercase tracking-wider text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
            >
              Pay now
            </button>
          </div>

          {/* Card 3: Studio AI chat card */}
          <div 
            style={{
              borderRadius: `${sandboxRadius}px`,
              padding: `${sandboxDensity * 4}px`,
            }}
            className="bg-zinc-950/70 border border-white/10 backdrop-blur-md flex flex-col justify-between h-[360px] text-left"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sandboxColor }} />
                <span className={`text-xs font-bold text-white ${sandboxFont}`}>Studio AI</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase">order #1043</span>
            </div>

            {/* Chat bubble area */}
            <div className="flex-1 flex flex-col gap-2.5 my-3.5 overflow-y-auto text-[10.5px] leading-relaxed">
              <div className="self-end bg-zinc-900 text-zinc-200 px-3 py-2 rounded-lg max-w-[85%] font-medium">
                Where's my order?
              </div>
              <div 
                style={{
                  borderLeft: `2px solid ${sandboxColor}`,
                  borderRadius: `${sandboxRadius / 2}px`,
                }}
                className="bg-white/5 text-zinc-300 px-3 py-2 max-w-[95%] font-semibold space-y-1"
              >
                <p>UPS package #1043 has shipped.</p>
                <p className="text-[9px] font-mono text-zinc-500">Estimated delivery: Tomorrow by 8:00 PM</p>
              </div>
            </div>

            <div className="relative">
              <input 
                type="text" 
                disabled 
                placeholder="Ask Studio AI..." 
                style={{ borderRadius: `${sandboxRadius}px` }}
                className="w-full bg-zinc-900 border border-white/5 px-3.5 py-2.5 text-xs text-zinc-400 placeholder:text-zinc-600 pr-8"
              />
              <button 
                style={{ backgroundColor: sandboxColor }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white rounded-full transition-transform active:scale-90"
              >
                <ChevronRight size={10} />
              </button>
            </div>
          </div>

          {/* Card 4: Inventory Table */}
          <div 
            style={{
              borderRadius: `${sandboxRadius}px`,
              padding: `${sandboxDensity * 4}px`,
            }}
            className="md:col-span-2 bg-zinc-950/70 border border-white/10 backdrop-blur-md flex flex-col justify-between h-[360px] text-left overflow-hidden"
          >
            <div className="space-y-3.5 w-full">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">Live Inventory Database</h3>
                <div className="inline-flex items-center gap-1.5 text-[9px] text-amber-400 font-bold bg-amber-400/5 px-2.5 py-0.75 border border-amber-400/20 rounded">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>2 running low</span>
                </div>
              </div>

              {/* Mock table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-[10.5px]">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
                      <th className="pb-2 font-normal">Item</th>
                      <th className="pb-2 font-normal">Available</th>
                      <th className="pb-2 font-normal">Location</th>
                      <th className="pb-2 font-normal text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-semibold text-zinc-300">
                    <tr>
                      <td className="py-2.5 text-white">Butter Croissant</td>
                      <td className="py-2.5 font-mono">64</td>
                      <td className="py-2.5 text-zinc-500">Case 1</td>
                      <td className="py-2.5 text-right"><span className="text-[8px] uppercase tracking-widest text-emerald-400 bg-emerald-400/5 border border-emerald-400/20 px-2 py-0.5 rounded">Fresh</span></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-white">Pancakes (Stack)</td>
                      <td className="py-2.5 font-mono">38</td>
                      <td className="py-2.5 text-zinc-500">Griddle</td>
                      <td className="py-2.5 text-right"><span className="text-[8px] uppercase tracking-widest text-orange-400 bg-orange-400/5 border border-orange-400/20 px-2 py-0.5 rounded">Popular</span></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-white">Belgian Waffle</td>
                      <td className="py-2.5 font-mono text-amber-400">12</td>
                      <td className="py-2.5 text-zinc-500">Griddle</td>
                      <td className="py-2.5 text-right"><span className="text-[8px] uppercase tracking-widest text-amber-400 bg-amber-400/5 border border-amber-400/20 px-2 py-0.5 rounded">Low</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                style={{ borderRadius: `${sandboxRadius / 2}px` }}
                className="flex-1 bg-zinc-900 border border-white/5 text-center py-2 text-[10px] font-mono font-black uppercase text-zinc-405 hover:text-white"
              >
                Filter rows
              </button>
              <button 
                style={{
                  backgroundColor: sandboxColor,
                  borderRadius: `${sandboxRadius / 2}px`,
                }}
                className="flex-1 text-center py-2 text-[10px] font-mono font-black uppercase text-white hover:brightness-110 active:scale-[0.98]"
              >
                Add new item
              </button>
            </div>
          </div>

          {/* Card 5: Revenue trend stats */}
          <div 
            style={{
              borderRadius: `${sandboxRadius}px`,
              padding: `${sandboxDensity * 4}px`,
            }}
            className="bg-zinc-950/70 border border-white/10 backdrop-blur-md flex flex-col justify-between h-[360px] text-left"
          >
            <div className="space-y-3.5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">Revenue Analytics</h3>
              
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-black text-white tracking-tight">$18,402</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 inline-flex items-center gap-0.5">
                  <ArrowUpRight size={11} /> +12%
                </span>
              </div>

              {/* Transactions activity timeline */}
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5 text-zinc-400">
                  <span className="text-zinc-300 font-semibold">Order #1043 Placed</span>
                  <span className="text-emerald-400 font-mono font-bold">+$248</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <span className="text-zinc-300 font-semibold">Order #1041 Refunded</span>
                  <span className="text-zinc-500 font-mono font-bold">-$89</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 font-semibold">Order #1040 Placed</span>
                  <span className="text-emerald-400 font-mono font-bold">+$156</span>
                </div>
              </div>
            </div>

            {/* Sparkline visualization grid */}
            <div className="h-10 w-full flex items-end gap-1 my-2">
              {[20, 35, 30, 45, 60, 55, 75, 90, 85].map((h, i) => (
                <div 
                  key={i} 
                  style={{ 
                    height: `${h}%`,
                    backgroundColor: i === 7 ? sandboxColor : `${sandboxColor}45`
                  }} 
                  className="flex-1 rounded-t-sm transition-all" 
                />
              ))}
            </div>

            <button 
              style={{ borderRadius: `${sandboxRadius / 2}px` }}
              className="w-full text-center py-2 text-[10px] font-mono font-black uppercase text-zinc-400 hover:text-white border border-white/5 hover:border-white/10"
            >
              See detailed ledger →
            </button>
          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          SANDBOX INTERACTIVE PLAYGROUND (With live-updating mock canvas)
          ──────────────────────────────────────────────────────────────────────── */}
      <section id="sandbox" className="relative max-w-7xl mx-auto px-6 py-20 border-t border-white/5 z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-display font-black text-white tracking-tight uppercase">
            Test the live playground
          </h2>
          <p className="text-xs text-[#8E8E93] font-bold uppercase tracking-wider mt-1.5">
            Tweak parameter inputs below and watch design token components rebuild dynamically.
          </p>
        </div>

        <div className="mx-auto max-w-5xl border border-white/10 bg-[#0F0F11]/60 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
          
          {/* Header Controls Bar */}
          <div className="bg-[#161619] px-5 py-3 flex items-center justify-between border-b border-white/5 select-none">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-blue-400" />
              <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider uppercase">Tokens Studio Artboard Canvas</span>
            </div>
            <div className="flex gap-2">
              <span className="h-2 w-2 rounded-full bg-zinc-800" />
              <span className="h-2 w-2 rounded-full bg-zinc-800" />
              <span className="h-2 w-2 rounded-full bg-zinc-800" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left Control Panel */}
            <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col gap-6 bg-[#0B0B0C]">
              
              {/* 1. Accent Seed Color */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Palette size={12} className="text-zinc-600" /> Primary Brand Token
                  </span>
                  <span className="text-[9px] font-mono text-zinc-700">primitive/color</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setSandboxColor(c.hex)}
                      title={c.name}
                      style={{ backgroundColor: c.hex }}
                      className={`h-7.5 w-7.5 rounded-full border border-black/40 transition-all hover:scale-105 active:scale-95 shrink-0 ${
                        sandboxColor === c.hex 
                          ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-[#0B0B0C]" 
                          : ""
                      }`}
                    />
                  ))}
                  
                  {/* Custom color container */}
                  <div className="relative h-7.5 w-11 rounded border border-white/10 overflow-hidden bg-[#18181B] flex-shrink-0">
                    <input
                      type="color"
                      value={sandboxColor}
                      onChange={(e) => setSandboxColor(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer bg-transparent border-none scale-150"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Density padding multiplier */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Scaling size={12} className="text-zinc-600" /> Density Scale
                  </span>
                  <span className="text-[9px] font-mono text-zinc-700">semantic/padding</span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-[#121215] p-1 rounded-lg border border-white/5">
                  {[
                    { label: "Compact", val: 3 },
                    { label: "Normal", val: 4 },
                    { label: "Loose", val: 6 },
                  ].map((d) => (
                    <button
                      key={d.val}
                      onClick={() => setSandboxDensity(d.val)}
                      className={`py-1.5 text-xs font-semibold rounded transition-all duration-150 ${
                        sandboxDensity === d.val 
                          ? "bg-zinc-800 text-white border border-white/10 shadow-sm" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Corner Radius */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <SlidersHorizontal size={12} className="text-zinc-600" /> Component Radii
                  </span>
                  <span className="text-[9px] font-mono text-zinc-700">component/radius</span>
                </div>
                <div className="grid grid-cols-4 gap-2 bg-[#121215] p-1 rounded-lg border border-white/5">
                  {[
                    { label: "Sharp", val: 0 },
                    { label: "Smooth", val: 6 },
                    { label: "Round", val: 12 },
                    { label: "Pill", val: 99 },
                  ].map((r) => (
                    <button
                      key={r.val}
                      onClick={() => setSandboxRadius(r.val)}
                      className={`py-1.5 text-[10px] font-semibold rounded transition-all duration-150 ${
                        sandboxRadius === r.val 
                          ? "bg-zinc-800 text-white border border-white/10" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Font Family swaps */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Monitor size={12} className="text-zinc-600" /> Typography Face
                  </span>
                  <span className="text-[9px] font-mono text-zinc-700">global/font</span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-[#121215] p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => setSandboxFont("font-sans")}
                    className={`py-1.5 text-xs font-semibold rounded transition-all duration-150 ${
                      sandboxFont === "font-sans" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Sans (Instrument)
                  </button>
                  <button
                    onClick={() => setSandboxFont("font-display")}
                    className={`py-1.5 text-xs font-semibold rounded transition-all duration-150 ${
                      sandboxFont === "font-display" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Display (Space)
                  </button>
                </div>
              </div>

            </div>

            {/* Right Live Artboard Area */}
            <div className="lg:col-span-7 p-8 flex items-center justify-center bg-[#070708] bg-[radial-gradient(#1c1c22_1px,transparent_1px)] bg-[size:16px_16px] min-h-[380px] relative overflow-hidden">
              
              {/* Dynamic Live Component Card */}
              <motion.div 
                layout
                style={{
                  borderRadius: sandboxRadius === 99 ? "99px" : `${sandboxRadius}px`,
                  padding: `${sandboxDensity * 4.5}px`,
                  gap: `${sandboxDensity * 3}px`,
                  borderColor: "rgba(255, 255, 255, 0.06)",
                  borderWidth: 1,
                  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
                }}
                className={`w-full max-w-sm flex flex-col bg-zinc-950/90 border backdrop-blur-md transition-all duration-300 ${sandboxFont}`}
              >
                
                {/* Header indicators */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      style={{ backgroundColor: sandboxColor }}
                      className="h-2.5 w-2.5 rounded-full shrink-0 animate-pulse" 
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Live Component Demo</span>
                  </div>
                  <span 
                    style={{ borderRadius: sandboxRadius === 99 ? "99px" : `${sandboxRadius / 2}px` }}
                    className="text-[9px] font-mono px-2 py-0.5 border border-white/5 bg-white/5 text-zinc-400 font-bold"
                  >
                    Preview Mode
                  </span>
                </div>

                {/* Card Title & Copy */}
                <div className="text-left">
                  <h4 className="text-sm font-black tracking-tight text-white mb-1">
                    System Token Reconfiguration
                  </h4>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed font-medium">
                    Watch element density, spacing margins, and borders update in real-time as variable options modify.
                  </p>
                </div>

                {/* Input mockup */}
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    disabled
                    placeholder="Input field styles bound..."
                    style={{
                      borderRadius: sandboxRadius === 99 ? "99px" : `${sandboxRadius / 2}px`,
                      borderColor: "rgba(255, 255, 255, 0.05)",
                      paddingLeft: `${sandboxDensity * 2.5}px`,
                      paddingRight: `${sandboxDensity * 2.5}px`,
                      paddingTop: `${sandboxDensity * 1.5}px`,
                      paddingBottom: `${sandboxDensity * 1.5}px`,
                    }}
                    className="w-full text-[11px] font-mono bg-zinc-900/60 border text-white focus:outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>

                {/* Action button rows */}
                <div 
                  style={{ gap: `${sandboxDensity * 2}px` }}
                  className="flex items-center"
                >
                  <button
                    style={{
                      backgroundColor: sandboxColor,
                      borderRadius: sandboxRadius === 99 ? "99px" : `${sandboxRadius / 2}px`,
                      paddingLeft: `${sandboxDensity * 3.5}px`,
                      paddingRight: `${sandboxDensity * 3.5}px`,
                      paddingTop: `${sandboxDensity * 2}px`,
                      paddingBottom: `${sandboxDensity * 2}px`,
                    }}
                    className="text-[11px] font-black uppercase text-white hover:brightness-110 active:scale-[0.98] transition-all flex-1 text-center font-bold"
                  >
                    Action Primary
                  </button>
                  
                  <button
                    style={{
                      borderRadius: sandboxRadius === 99 ? "99px" : `${sandboxRadius / 2}px`,
                      paddingLeft: `${sandboxDensity * 3.5}px`,
                      paddingRight: `${sandboxDensity * 3.5}px`,
                      paddingTop: `${sandboxDensity * 2}px`,
                      paddingBottom: `${sandboxDensity * 2}px`,
                    }}
                    className="text-[11px] font-bold text-white border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all flex-1 text-center"
                  >
                    Cancel
                  </button>
                </div>

              </motion.div>
            </div>

          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          THE GRID SHOWCASE OF ADVANCED ATOMIC FEATURES
          ──────────────────────────────────────────────────────────────────────── */}
      <section id="features" className="relative max-w-6xl mx-auto px-6 py-12 z-10">
        <div className="mb-10 text-left border-b border-white/5 pb-4">
          <h2 className="text-2.5xl font-display font-black text-white tracking-tight uppercase">
            Engineered for atomic design
          </h2>
          <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider mt-1">
            Precision tools to consolidate variables and layouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          {/* CARD 1: Semantic Scale Modifiers */}
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="md:col-span-2 border border-white/5 bg-zinc-950/40 backdrop-blur-md rounded-2xl p-6 hover:border-blue-500/25 transition-all duration-200 select-none shadow-xl flex flex-col justify-between min-h-[300px]"
          >
            <div>
              <div className="h-9 w-9 rounded bg-zinc-900 text-blue-400 border border-white/5 flex items-center justify-center mb-5">
                <Layers size={16} />
              </div>
              <h3 className="text-base font-display font-black uppercase text-white mb-2 tracking-wide">
                Semantic Scale Modifiers
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-md font-medium">
                Define values using mathematical scales. Modifying a core variable propagates changes down through semantic states (hover, focus, disabled) automatically.
              </p>
            </div>

            {/* Graphical Preview decoration inside card */}
            <div className="mt-6 flex gap-2.5 border border-white/5 bg-[#121215]/50 p-3 rounded-xl overflow-hidden relative">
              {[
                { name: "brand-100", height: "h-6", bg: "bg-blue-950/20 text-blue-400 border-blue-500/10" },
                { name: "brand-300", height: "h-9", bg: "bg-blue-900/20 text-blue-300 border-blue-500/20" },
                { name: "brand-500", height: "h-12", bg: "bg-blue-600 text-white font-bold border-blue-400/20" },
                { name: "brand-700", height: "h-16", bg: "bg-blue-850 text-blue-100 border-blue-400/10" },
                { name: "brand-900", height: "h-20", bg: "bg-blue-950 text-blue-400 border-blue-500/5" },
              ].map((s, i) => (
                <div key={s.name} className="flex-1 flex flex-col justify-end items-center gap-1.5">
                  <div 
                    style={{ backgroundColor: i === 2 ? sandboxColor : undefined }}
                    className={`${s.height} w-full rounded-sm border ${s.bg} flex items-center justify-center text-[10px] font-mono shadow-inner`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[8.5px] font-mono text-zinc-600">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CARD 2: Calculated Nested Borders */}
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="border border-white/5 bg-zinc-950/40 backdrop-blur-md rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200 select-none shadow-xl flex flex-col justify-between min-h-[300px]"
          >
            <div>
              <div className="h-9 w-9 rounded bg-zinc-900 text-zinc-400 border border-white/5 flex items-center justify-center mb-5">
                <SlidersHorizontal size={16} />
              </div>
              <h3 className="text-base font-display font-black uppercase text-white mb-2 tracking-wide">
                Calculated Borders
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed font-medium">
                Preserve spatial curve ratios dynamically. Coordinate radius scales to perfectly balance nested layout elements.
              </p>
            </div>

            {/* Nested Border Preview */}
            <div className="mt-6 flex items-center justify-center p-4 bg-[#121215]/50 border border-white/5 rounded-xl h-24 relative overflow-hidden">
              <div className="w-16 h-16 border border-zinc-800 rounded-[16px] flex items-center justify-center relative">
                <div 
                  style={{ borderRadius: `${sandboxRadius}px` }}
                  className="w-11 h-11 border border-blue-500/40 bg-blue-500/10 rounded-[8px] flex items-center justify-center font-mono text-[9px] text-blue-300"
                >
                  r: {sandboxRadius}px
                </div>
                <span className="absolute top-1 left-1 text-[7px] font-mono text-zinc-600">r: {sandboxRadius * 2}px</span>
              </div>
            </div>
          </div>

          {/* CARD 3: Accessibility Checker */}
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="border border-white/5 bg-zinc-950/40 backdrop-blur-md rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200 select-none shadow-xl flex flex-col justify-between min-h-[300px]"
          >
            <div>
              <div className="h-9 w-9 rounded bg-zinc-900 text-zinc-400 border border-white/5 flex items-center justify-center mb-5">
                <Activity size={16} />
              </div>
              <h3 className="text-base font-display font-black uppercase text-white mb-2 tracking-wide">
                Accessibility Checking
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed font-medium">
                Real-time contrast engine checks WCAG alignment. Ensures text readability across all theme modes automatically.
              </p>
            </div>

            {/* Graphic Score */}
            <div className="mt-6 flex items-center justify-between p-3 bg-[#121215]/50 border border-white/5 rounded-xl font-mono text-[10px]">
              <div className="flex flex-col gap-0.5">
                <span className="text-zinc-500">Luminance Ratio</span>
                <span className="text-sm font-bold text-white tracking-tight">8.4 : 1</span>
              </div>
              <span className="px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[8.5px] tracking-wider">
                WCAG AAA Pass
              </span>
            </div>
          </div>

          {/* CARD 4: Export sync pipeline */}
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="md:col-span-2 border border-white/5 bg-zinc-950/40 backdrop-blur-md rounded-2xl p-6 hover:border-blue-500/20 transition-all duration-200 select-none shadow-xl flex flex-col justify-between min-h-[300px]"
          >
            <div>
              <div className="h-9 w-9 rounded bg-zinc-900 text-blue-400 border border-white/5 flex items-center justify-center mb-5">
                <Code size={16} />
              </div>
              <h3 className="text-base font-display font-black uppercase text-white mb-2 tracking-wide">
                One-Click Sync Exports
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-md font-medium">
                Export ready-to-use variable packages immediately. Support for JSON tokens, CSS variables maps, Tailwind variables, and Figma design tokens sync.
              </p>
            </div>

            {/* Sync pipeline mock list */}
            <div className="mt-6 grid grid-cols-3 gap-2 p-2 bg-[#121215]/50 border border-white/5 rounded-xl text-center font-mono text-[10px] text-[#A1A1AA]">
              <div className="py-2 rounded bg-zinc-900 border border-white/10 text-white flex items-center justify-center gap-1.5 shadow-sm">
                <Package size={11} className="text-blue-400" />
                <span>Tailwind</span>
              </div>
              <div className="py-2 rounded border border-white/5 bg-zinc-950/20 flex items-center justify-center gap-1.5">
                <BookOpen size={11} className="text-amber-500" />
                <span>CSS Vars</span>
              </div>
              <div className="py-2 rounded border border-white/5 bg-zinc-950/20 flex items-center justify-center gap-1.5">
                <Code size={11} className="text-zinc-500" />
                <span>Tokens JSON</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          AGENT READINESS WORKFLOW (MCP & CLI MOCK)
          ──────────────────────────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 border-t border-white/5 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="h-9 w-9 rounded bg-zinc-900 text-blue-400 border border-white/5 flex items-center justify-center">
              <Terminal size={16} />
            </div>
            <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight">
              A design system that your agent can use
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed font-semibold">
              Scaffold projects, browse templates, generate themes, and get agent-ready docs from the command line or MCP.
            </p>
            <div className="flex gap-4">
              <a 
                href="/docs/cli" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-blue-400 transition-colors"
              >
                Read CLI Docs <ArrowRight size={13} />
              </a>
              <span className="text-zinc-700">|</span>
              <a 
                href="/docs/mcp" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-blue-400 transition-colors"
              >
                MCP Server Config <ArrowRight size={13} />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#0F0F11]/60 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4 select-none">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Antigravity Terminal</span>
            </div>
            
            <div className="space-y-4 text-left">
              <div>
                <p className="text-zinc-500">$ npx -y @arkitype/cli init --theme=emerald</p>
                <p className="text-emerald-400 font-bold">✔ Successfully initialized Arkitype Design System</p>
              </div>
              <div>
                <p className="text-zinc-500">$ arkitype sync --figma-variables</p>
                <p className="text-zinc-300">✔ Found 187 active tokens</p>
                <p className="text-zinc-300">✔ Hydrated 43 component style maps</p>
                <p className="text-blue-400 font-bold">✔ Sync complete: Shipped variables bundle directly to Figma API</p>
              </div>
              <div>
                <p className="text-zinc-500">$ arkitype audit --wcag-contrast</p>
                <p className="text-zinc-300">✔ Analyzing ramps...</p>
                <p className="text-emerald-400 font-bold">✔ 100% WCAG AA contrast compliance verified (4.5:1 minimum met)</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          STAY IN THE KNOW / BLOG SECTION
          ──────────────────────────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 border-t border-white/5 z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-16 select-none">
          <div>
            <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight">
              Stay in the know
            </h2>
            <p className="text-xs text-zinc-450 font-bold uppercase tracking-wider mt-1.5">
              Read the latest updates from the Arkitype Open Source team.
            </p>
          </div>
          <button 
            onClick={() => setView("login")}
            className="text-xs font-black uppercase tracking-wider text-zinc-450 hover:text-white border border-white/5 hover:border-white/10 px-5 py-2.5 rounded-lg bg-zinc-950/20"
          >
            View all posts
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          {/* Post 1 */}
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="border border-white/5 bg-zinc-950/40 rounded-2xl p-6 hover:border-blue-500/25 transition-all duration-200 shadow-lg flex flex-col justify-between h-[240px]"
          >
            <div className="space-y-3">
              <span className="text-[9px] font-mono font-black uppercase text-blue-400">Release Note</span>
              <h4 className="text-sm font-black text-white tracking-tight uppercase">
                Arkitype v0.1.0: better tables, keyboard navigation, and accessibility
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                Full WAI-ARIA keyboard patterns, automated contrast ratios audits, flexible layouts grid inside component fields, and code exports sync pipelines.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono font-semibold">
              <span>Arkitype Team</span>
              <span>•</span>
              <span>Jul 4, 2026</span>
            </div>
          </div>

          {/* Post 2 */}
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="border border-white/5 bg-zinc-950/40 rounded-2xl p-6 hover:border-blue-500/25 transition-all duration-200 shadow-lg flex flex-col justify-between h-[240px]"
          >
            <div className="space-y-3">
              <span className="text-[9px] font-mono font-black uppercase text-blue-400">Architecture</span>
              <h4 className="text-sm font-black text-white tracking-tight uppercase">
                How Arkitype works: parsed tokens and Style Dictionary schemas
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                A look under the hood of the compiler engine: the design variables models, semantic tokens mappings, and the systems powering real-time page updates.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono font-semibold">
              <span>Catherine & Cindy</span>
              <span>•</span>
              <span>Jun 29, 2026</span>
            </div>
          </div>

          {/* Post 3 */}
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="border border-white/5 bg-zinc-950/40 rounded-2xl p-6 hover:border-blue-500/25 transition-all duration-200 shadow-lg flex flex-col justify-between h-[240px]"
          >
            <div className="space-y-3">
              <span className="text-[9px] font-mono font-black uppercase text-blue-400">Overview</span>
              <h4 className="text-sm font-black text-white tracking-tight uppercase">
                Introducing Arkitype: design systems for the AI-agent age
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                Arkitype is an open source guided design-system builder built for speed, visual consistency, and agentic workflows. Available in beta.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono font-semibold">
              <span>Arkitype Team</span>
              <span>•</span>
              <span>Jun 18, 2026</span>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          DISCOVER THE FULL DESIGN SYSTEM (Footer CTA)
          ──────────────────────────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 border-t border-white/5 z-10 text-center">
        <h2 className="text-4xl sm:text-5xl font-display font-black text-white uppercase tracking-tight mb-4">
          Discover the full design system
        </h2>
        <p className="text-xs text-zinc-450 font-bold uppercase tracking-widest max-w-2xl mx-auto mb-12">
          Browse components, explore production-ready templates, and tune themes to match your brand; pick a starting point and go.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setView("login")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 font-black text-xs uppercase tracking-wider px-8 py-4 shadow-lg hover:bg-zinc-200 active:scale-[0.98] transition-all"
          >
            Get started
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("showcase");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-white/10 text-white font-black text-xs uppercase tracking-wider px-8 py-4 shadow-lg hover:bg-zinc-800 hover:border-white/20 active:scale-[0.98] transition-all"
          >
            Browse components
          </button>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────────────────
          FOOTER
          ──────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1C1C1E] py-12 px-6 bg-[#060608] mt-16 text-xs text-zinc-550 font-medium relative z-10">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 select-none">
            <div className="flex h-5.5 w-5.5 items-center justify-center rounded bg-gradient-to-tr from-zinc-700 to-zinc-950 border border-white/10 text-white font-black text-[9px] shadow-sm">
              A
            </div>
            <span className="font-display font-black text-white tracking-wider uppercase">ARKITYPE</span>
            <span>© 2026 Arkitype Platforms, Inc.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="cursor-pointer hover:text-white transition-colors" onClick={() => setView("login")}>Login</span>
            <span className="cursor-pointer hover:text-white transition-colors">Privacy</span>
            <span className="cursor-pointer hover:text-white transition-colors">Terms</span>
            <span className="cursor-pointer hover:text-white transition-colors">Documentation</span>
            <a href="https://github.com/facebook/astryx" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

      {/* ────────────────────────────────────────────────────────────────────────
          SEARCH / COMMAND PALETTE DIALOG OVERLAY
          ──────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5">
                <Search size={16} className="text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Search docs, components, templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none placeholder:text-zinc-650"
                  autoFocus
                />
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="text-[9px] font-mono bg-zinc-900 border border-white/10 px-2 py-1 rounded text-zinc-500"
                >
                  ESC
                </button>
              </div>

              <div className="p-4 min-h-[160px] flex items-center justify-center text-zinc-500 text-xs font-semibold">
                {searchQuery ? (
                  <p>No results found for "{searchQuery}"</p>
                ) : (
                  <p>Type to search...</p>
                )}
              </div>

              <div className="bg-zinc-900/40 px-4 py-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                <span>Use ↑ ↓ to navigate</span>
                <span>↵ to select</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
