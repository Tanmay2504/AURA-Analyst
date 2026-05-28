"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Boot sequence lines ─────────────────────────────────────────────────── */
const BOOT_LINES = [
  "AURA NEURAL ANALYST v2.0.0",
  "Copyright (c) 2026 AURA Systems",
  "─────────────────────────────────────────",
  "[ OK ] Loading kernel modules...",
  "[ OK ] Initializing AWS Bedrock runtime...",
  "[ OK ] Claude Sonnet 4.6 model loaded",
  "[ OK ] Statistical engine ready",
  "[ OK ] Database connection established",
  "[ OK ] All systems nominal",
  "─────────────────────────────────────────",
  "Type HELP for available commands.",
];

/* ── Typewriter hook ─────────────────────────────────────────────────────── */
function useTypewriter(text: string, speed = 28, delay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        setDisplayed(text.slice(0, ++i));
        if (i >= text.length) { clearInterval(iv); setDone(true); }
      }, speed);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [text, speed, delay]);
  return { displayed, done };
}

/* ── Boot screen ─────────────────────────────────────────────────────────── */
function BootScreen({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const addLine = () => {
      if (i < BOOT_LINES.length) {
        setLines((prev) => [...prev, BOOT_LINES[i++]]);
        setTimeout(addLine, i === 0 ? 0 : 120 + Math.random() * 80);
      } else {
        setTimeout(() => setDone(true), 600);
        setTimeout(onDone, 1400);
      }
    };
    const t = setTimeout(addLine, 300);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[#0a0a08] flex items-center justify-center scanlines"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-full max-w-2xl px-8 py-12 font-mono text-sm">
        <AnimatePresence>
          {lines.map((line, i) => {
            if (!line) return null;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.1 }}
                className={`leading-6 ${line.startsWith("[ OK ]") ? "text-[#4ade80]" :
                  line.startsWith("AURA") ? "text-[#fb923c] font-bold text-base" :
                    line.startsWith("─") ? "text-[#2a2a1e]" :
                      "text-[#7a7060]"
                  }`}
              >
                {line}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-[#f97316]"
          >
            {">"} <span className="blink">█</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Animated grid / data-stream background ──────────────────────────────── */
function DataGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Falling data columns (Matrix-style but amber)
    const cols = Math.floor(canvas.width / 20);
    const drops = Array.from({ length: cols }, () => Math.random() * -50);
    const chars = "01アイウエオカキクケコABCDEF0123456789><[]{}";

    let animId: number;
    const draw = () => {
      ctx.fillStyle = "rgba(10,10,8,0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "12px 'JetBrains Mono', monospace";
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const alpha = Math.random() * 0.15 + 0.02;
        ctx.fillStyle = `rgba(249,115,22,${alpha})`;
        ctx.fillText(char, i * 20, y * 20);
        if (y * 20 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.3;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40" />;
}

/* ── Features ────────────────────────────────────────────────────────────── */
const FEATURES = [
  { cmd: "analyze --mode deep", label: "Deep Analysis", desc: "Multi-agent AI dissects every column, pattern, and anomaly in your dataset." },
  { cmd: "visualize --auto", label: "Auto Charts", desc: "Recharts-powered visualizations generated from your data structure automatically." },
  { cmd: "forecast --horizon 30d", label: "Forecasting", desc: "Time-series prediction with confidence intervals for numeric trends." },
  { cmd: "query --nl", label: "NL Queries", desc: "Ask questions in plain English. Get precise answers from your data." },
  { cmd: "export --format pdf", label: "PDF Export", desc: "One-click export of your full analysis report with charts included." },
  { cmd: "history --list", label: "Persistence", desc: "Every analysis saved. Recall any past session instantly." },
];

/* ── Main hero ───────────────────────────────────────────────────────────── */
export default function AuraHero({ onGetStarted }: { onGetStarted?: () => void }) {
  const [booting, setBooting] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const headline = useTypewriter("NEURAL DATA ANALYST", 55, 200);

  const handleBootDone = () => {
    setBooting(false);
    setTimeout(() => setShowContent(true), 100);
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a08] overflow-hidden">
      {/* Boot screen */}
      <AnimatePresence>{booting && <BootScreen onDone={handleBootDone} />}</AnimatePresence>

      {/* Data stream background */}
      <DataGrid />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-60" />

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.08) 3px,rgba(0,0,0,.08) 4px)"
      }} />

      {/* Amber corner accents */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#f97316]/40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#f97316]/40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[#f97316]/40 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#f97316]/40 pointer-events-none" />

      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* ── Navbar ── */}
            <nav className="relative z-20 flex items-center justify-between px-6 py-4 md:px-12 border-b border-[#2a2a1e]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-[#f97316]/60 flex items-center justify-center amber-pulse">
                  <span className="text-[#f97316] font-mono text-xs font-bold">AU</span>
                </div>
                <div>
                  <span className="font-mono text-sm font-bold text-[#f97316] tracking-widest">AURA</span>
                  <span className="font-mono text-sm text-[#7a7060] ml-2">// neural analyst</span>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-6">
                {["features", "how-it-works", "docs"].map((item) => (
                  <a key={item} href={`#${item}`}
                    className="font-mono text-xs text-[#7a7060] hover:text-[#f97316] transition-colors uppercase tracking-widest">
                    {item.replace("-", "_")}
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="status-online hidden sm:inline-flex">online</span>
                <button onClick={onGetStarted} className="btn-amber">
                  <span>./launch</span>
                </button>
              </div>
            </nav>

            {/* ── Hero ── */}
            <section className="relative z-10 px-6 pt-20 pb-16 md:px-12 md:pt-28">
              <div className="max-w-5xl mx-auto">

                {/* System tag */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 font-mono text-xs text-[#7a7060] flex items-center gap-3"
                >
                  <span className="text-[#f97316]">$</span>
                  <span>aura --version 2.0.0 --env production --model claude-sonnet-4-6</span>
                </motion.div>

                {/* Main headline */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="mb-4"
                >
                  <h1 className="font-mono text-5xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight">
                    <span className="text-[#e8e0cc]">AURA</span>
                    <br />
                    <span className="text-[#f97316]" style={{ textShadow: "0 0 30px rgba(249,115,22,0.4)" }}>
                      {headline.displayed}
                      {!headline.done && <span className="blink">█</span>}
                    </span>
                  </h1>
                </motion.div>

                {/* Tagline */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="font-mono text-sm md:text-base text-[#7a7060] mb-10 max-w-2xl leading-relaxed"
                >
                  <span className="text-[#f97316]">{">"}</span>{" "}
                  Upload any CSV. Three AI agents analyze, visualize, and explain your data.
                  <br />
                  <span className="text-[#f97316]">{">"}</span>{" "}
                  Powered by AWS Bedrock · Claude Sonnet 4.6 · Production-grade.
                </motion.p>

                {/* CTA row */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap gap-4 mb-16"
                >
                  <button onClick={onGetStarted} className="btn-amber text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-[#f97316]">$</span> ./analyze --start
                    </span>
                  </button>
                  <a href="#features"
                    className="font-mono text-sm border border-[#2a2a1e] px-6 py-2.5 text-[#7a7060] hover:border-[#f97316]/40 hover:text-[#e8e0cc] transition-all uppercase tracking-widest">
                    learn more
                  </a>
                </motion.div>

                {/* Terminal mockup */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="term-card scanlines"
                >
                  <div className="term-header">
                    <span className="dot dot-r" />
                    <span className="dot dot-y" />
                    <span className="dot dot-g" />
                    <span className="ml-2 flex-1">aura@neural-analyst: ~/analysis</span>
                    <span className="status-online">live</span>
                  </div>
                  <div className="p-5 font-mono text-xs space-y-1.5 relative z-10">
                    <div className="text-[#7a7060]"><span className="text-[#f97316]">$</span> aura analyze sales_q4_2025.csv --mode deep</div>
                    <div className="text-[#4ade80]">✓ File loaded: 12,847 rows × 24 columns</div>
                    <div className="text-[#7a7060]">  [1/3] Data Custodian — cleaning &amp; validating...</div>
                    <div className="text-[#7a7060]">  [2/3] Statistical Researcher — pattern detection...</div>
                    <div className="text-[#7a7060]">  [3/3] Business Reporter — synthesizing insights...</div>
                    <div className="text-[#4ade80]">✓ Analysis complete in 43.2s</div>
                    <div className="mt-3 border-t border-[#2a2a1e] pt-3">
                      <div className="text-[#f97316] mb-1">── EXECUTIVE SUMMARY ──────────────────────────</div>
                      <div className="text-[#e8e0cc] leading-relaxed">Revenue shows strong upward trend (+23% YoY). Q4 performance exceeds projections by 12%. Three anomalous spikes detected in week 47 — likely promotional events. Forecast: continued growth through Q1 2026.</div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-3 border-t border-[#2a2a1e] pt-3">
                      {[
                        { k: "rows", v: "12,847" },
                        { k: "cols", v: "24" },
                        { k: "insights", v: "8" },
                        { k: "anomalies", v: "3" },
                      ].map((s) => (
                        <div key={s.k} className="border border-[#2a2a1e] p-2 text-center">
                          <div className="text-[#f97316] font-bold text-sm">{s.v}</div>
                          <div className="text-[#3d3a2e] text-[10px] uppercase">{s.k}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-[#f97316]">{">"} <span className="blink">█</span></div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* ── Stats bar ── */}
            <motion.section
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="relative z-10 border-y border-[#2a2a1e] px-6 py-6 md:px-12"
            >
              <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { v: "10×", l: "faster_analysis" },
                  { v: "3", l: "ai_agents" },
                  { v: "∞", l: "datasets" },
                  { v: "99%", l: "uptime" },
                ].map((s, i) => (
                  <motion.div
                    key={s.l}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="text-center"
                  >
                    <div className="font-mono text-3xl font-bold text-[#f97316]" style={{ textShadow: "0 0 16px rgba(249,115,22,0.4)" }}>{s.v}</div>
                    <div className="font-mono text-[10px] text-[#3d3a2e] uppercase tracking-widest mt-1">{s.l}</div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── Features ── */}
            <section id="features" className="relative z-10 px-6 py-20 md:px-12">
              <div className="max-w-5xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  <div className="font-mono text-xs text-[#7a7060] mb-2">
                    <span className="text-[#f97316]">$</span> aura --list-features
                  </div>
                  <h2 className="font-mono text-3xl md:text-4xl font-bold text-[#e8e0cc]">
                    CAPABILITIES<span className="text-[#f97316] blink">_</span>
                  </h2>
                </motion.div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {FEATURES.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ delay: i * 0.07 }}
                      className="term-card p-5 group"
                    >
                      <div className="font-mono text-[10px] text-[#f97316]/60 mb-3 group-hover:text-[#f97316] transition-colors">
                        $ {f.cmd}
                      </div>
                      <div className="font-mono text-sm font-bold text-[#e8e0cc] mb-2">{f.label}</div>
                      <div className="text-xs text-[#7a7060] leading-relaxed">{f.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── How it works ── */}
            <section id="how-it-works" className="relative z-10 px-6 py-16 md:px-12 border-t border-[#2a2a1e]">
              <div className="max-w-5xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  <div className="font-mono text-xs text-[#7a7060] mb-2">
                    <span className="text-[#f97316]">$</span> man aura --section usage
                  </div>
                  <h2 className="font-mono text-3xl font-bold text-[#e8e0cc]">
                    HOW_IT_WORKS<span className="text-[#f97316] blink">_</span>
                  </h2>
                </motion.div>

                <div className="space-y-0">
                  {[
                    { n: "01", cmd: "upload", desc: "Drop any CSV file. AURA accepts any structure, any size." },
                    { n: "02", cmd: "process", desc: "Three AI agents run in sequence: Data Custodian → Statistical Researcher → Business Reporter." },
                    { n: "03", cmd: "output", desc: "Receive charts, forecasts, NL query interface, and a full exportable report." },
                  ].map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 }}
                      className="flex gap-6 border-b border-[#2a2a1e] py-6 last:border-0"
                    >
                      <div className="font-mono text-4xl font-bold text-[#2a2a1e] w-16 flex-shrink-0 pt-1">{step.n}</div>
                      <div>
                        <div className="font-mono text-xs text-[#f97316] mb-1">$ aura {step.cmd}</div>
                        <div className="font-mono text-base font-bold text-[#e8e0cc] mb-1 uppercase">{step.cmd}</div>
                        <div className="text-sm text-[#7a7060]">{step.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── CTA ── */}
            <section className="relative z-10 px-6 py-20 md:px-12 border-t border-[#2a2a1e]">
              <div className="max-w-3xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="term-card p-8 md:p-12 text-center scanlines"
                >
                  <div className="term-header -mx-8 -mt-8 mb-8 md:-mx-12 md:-mt-12">
                    <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                    <span className="ml-2">aura@neural-analyst: ~/ready</span>
                  </div>
                  <div className="font-mono text-xs text-[#7a7060] mb-4 relative z-10">
                    <span className="text-[#f97316]">$</span> echo &quot;Ready to analyze your data?&quot;
                  </div>
                  <h2 className="font-mono text-2xl md:text-4xl font-bold text-[#e8e0cc] mb-3 relative z-10">
                    INITIALIZE<br />
                    <span className="text-[#f97316]">ANALYSIS SESSION</span>
                  </h2>
                  <p className="text-sm text-[#7a7060] mb-8 relative z-10">
                    No account required. No setup. Just upload and analyze.
                  </p>
                  <button onClick={onGetStarted} className="btn-amber relative z-10">
                    <span>$ ./analyze --start</span>
                  </button>
                </motion.div>
              </div>
            </section>

            {/* ── Footer ── */}
            <footer className="relative z-10 border-t border-[#2a2a1e] px-6 py-6 md:px-12">
              <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="font-mono text-xs text-[#3d3a2e]">
                  AURA NEURAL ANALYST v2.0.0 · © 2026
                </div>
                <div className="font-mono text-xs text-[#3d3a2e]">
                  AWS Bedrock · Claude Sonnet 4.6 · Render · Vercel
                </div>
                <div className="flex gap-4 font-mono text-xs text-[#3d3a2e]">
                  <a href="https://github.com/Tanmay2504/AURA-Analyst" target="_blank" rel="noopener noreferrer"
                    className="hover:text-[#f97316] transition-colors">github</a>
                  <a href="/admin" className="hover:text-[#f97316] transition-colors">admin</a>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
