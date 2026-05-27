"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BarChart3, TrendingUp, Zap, Database, Brain, Shield, ArrowRight, Sparkles } from "lucide-react";

// Animated particle canvas
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }> = [];

    const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981"];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

// Typewriter effect
function TypewriterText({ words }: { words: string[] }) {
  const [currentWord, setCurrentWord] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWord];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setCurrentText(word.substring(0, currentText.length + 1));
        if (currentText.length === word.length) {
          setTimeout(() => setIsDeleting(true), 1800);
        }
      } else {
        setCurrentText(word.substring(0, currentText.length - 1));
        if (currentText.length === 0) {
          setIsDeleting(false);
          setCurrentWord((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? 60 : 100);
    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWord, words]);

  return (
    <span className="gradient-text typing-cursor">{currentText}</span>
  );
}

// Floating orb
function FloatingOrb({ color, size, x, y, delay }: { color: string; size: number; x: string; y: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle at 30% 30%, ${color}40, ${color}05)`,
        filter: `blur(${size / 3}px)`,
      }}
      animate={{
        y: [0, -30, 0],
        scale: [1, 1.1, 1],
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{
        duration: 8 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Claude Sonnet analyzes your data with enterprise-grade intelligence",
    color: "from-blue-500/20 to-blue-600/5",
    iconColor: "text-blue-400",
    border: "hover:border-blue-500/40",
  },
  {
    icon: TrendingUp,
    title: "Smart Visualizations",
    description: "Auto-generated interactive charts and forecasts from your data",
    color: "from-purple-500/20 to-purple-600/5",
    iconColor: "text-purple-400",
    border: "hover:border-purple-500/40",
  },
  {
    icon: Database,
    title: "Data Persistence",
    description: "All analyses saved with full history and instant recall",
    color: "from-cyan-500/20 to-cyan-600/5",
    iconColor: "text-cyan-400",
    border: "hover:border-cyan-500/40",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Quick mode delivers insights in under 15 seconds",
    color: "from-emerald-500/20 to-emerald-600/5",
    iconColor: "text-emerald-400",
    border: "hover:border-emerald-500/40",
  },
  {
    icon: BarChart3,
    title: "Deep Insights",
    description: "Statistical analysis, outlier detection, and trend forecasting",
    color: "from-orange-500/20 to-orange-600/5",
    iconColor: "text-orange-400",
    border: "hover:border-orange-500/40",
  },
  {
    icon: Shield,
    title: "Enterprise Ready",
    description: "AWS Bedrock powered — secure, scalable, production-grade",
    color: "from-rose-500/20 to-rose-600/5",
    iconColor: "text-rose-400",
    border: "hover:border-rose-500/40",
  },
];

const stats = [
  { value: "10x", label: "Faster Analysis" },
  { value: "99%", label: "Accuracy" },
  { value: "∞", label: "Datasets" },
  { value: "3", label: "AI Models" },
];

export default function AuraHero({ onGetStarted }: { onGetStarted?: () => void }) {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, -80]);

  return (
    <div className="relative min-h-screen bg-[#020817] overflow-hidden">
      {/* Particle background */}
      <ParticleCanvas />

      {/* Floating orbs */}
      <FloatingOrb color="#3b82f6" size={500} x="-10%" y="-20%" delay={0} />
      <FloatingOrb color="#8b5cf6" size={400} x="60%" y="-10%" delay={2} />
      <FloatingOrb color="#06b6d4" size={300} x="80%" y="50%" delay={4} />
      <FloatingOrb color="#10b981" size={250} x="10%" y="60%" delay={1} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />

      {/* Scanline effect */}
      <div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none"
        style={{ animation: "scanline 8s linear infinite" }}
      />

      {/* Navbar */}
      <motion.nav
        className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center pulse-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            AURA <span className="gradient-text-blue">Analyst</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "How it Works", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
              className="text-sm text-slate-400 hover:text-white transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>

        <button
          onClick={onGetStarted}
          className="glow-button text-sm"
        >
          <span className="flex items-center gap-2">
            Launch App <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </motion.nav>

      {/* Hero Content */}
      <motion.section
        className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-16 pb-24 md:pt-24"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2 text-sm font-medium text-blue-300 backdrop-blur-sm neon-border">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Powered by AWS Bedrock · Claude Sonnet
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          className="mx-auto mb-6 max-w-5xl text-5xl font-extrabold tracking-tight text-white md:text-7xl lg:text-8xl leading-[1.05]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Turn Raw Data Into{" "}
          <br className="hidden md:block" />
          <TypewriterText words={["Actionable Insights", "Business Intelligence", "Smart Decisions", "Powerful Stories"]} />
        </motion.h1>

        {/* Subheading */}
        <motion.p
          className="mx-auto mb-10 max-w-2xl text-lg text-slate-400 md:text-xl leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Upload any CSV file and let AURA's multi-agent AI system analyze, visualize, and explain your data — in seconds, not hours.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <button
            onClick={onGetStarted}
            className="glow-button group"
          >
            <span className="flex items-center gap-2 text-base">
              Start Analyzing Free
              <Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </span>
          </button>
          <a
            href="#features"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-600 bg-slate-800/50 px-8 py-4 text-base font-semibold text-slate-200 backdrop-blur-sm transition-all duration-300 hover:border-slate-400 hover:bg-slate-700/60 hover:text-white"
          >
            See Features
            <motion.span
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ↓
            </motion.span>
          </a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="flex flex-wrap justify-center gap-8 md:gap-16 mb-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className="text-3xl md:text-4xl font-extrabold gradient-text-blue">{stat.value}</div>
              <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          className="relative w-full max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          {/* Glow behind mockup */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 blur-3xl rounded-3xl" />

          <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-800/60">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-4 rounded-md bg-slate-700/60 px-3 py-1 text-xs text-slate-400 text-center">
                aura-analyst.vercel.app
              </div>
            </div>

            {/* Mock dashboard content */}
            <div className="p-6 grid grid-cols-3 gap-4">
              {/* Left panel */}
              <div className="col-span-1 space-y-3">
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 mb-2">Analysis Mode</div>
                  <div className="grid grid-cols-3 gap-1">
                    {["⚡", "⚖️", "🔬"].map((icon, i) => (
                      <div key={i} className={`rounded-lg p-2 text-center text-xs ${i === 1 ? "bg-blue-500/20 border border-blue-500/40 text-blue-300" : "bg-slate-700/40 text-slate-500"}`}>
                        {icon}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 p-4 text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-xs text-slate-400">Drop CSV here</div>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 space-y-2">
                  {["Data Custodian ✓", "Statistical Researcher ✓", "Business Reporter ✓"].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-slate-400">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div className="col-span-2 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Rows", value: "12,847", color: "text-blue-400" },
                    { label: "Columns", value: "24", color: "text-purple-400" },
                    { label: "Insights", value: "8", color: "text-emerald-400" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-center">
                      <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-slate-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {/* Fake chart bars */}
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                  <div className="text-xs text-slate-500 mb-3">Revenue Trend</div>
                  <div className="flex items-end gap-1 h-16">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-blue-600 to-purple-500"
                        style={{ height: `${h}%` }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.8 + i * 0.05, duration: 0.4 }}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
                  <div className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-emerald-400 font-semibold">AI Insight: </span>
                    Revenue shows a strong upward trend with 23% YoY growth. Q4 performance exceeds projections by 12%...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 py-24 md:px-8">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-4">
              Everything you need
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built for <span className="gradient-text">data professionals</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              From quick summaries to deep statistical analysis — AURA adapts to your workflow.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  className={`glass-card rounded-2xl p-6 border border-slate-700/50 ${feature.border} bg-gradient-to-br ${feature.color}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  whileHover={{ y: -6 }}
                >
                  <div className={`inline-flex rounded-xl bg-slate-800/60 p-3 mb-4 ${feature.iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 px-4 py-24 md:px-8">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How it <span className="gradient-text">works</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Upload CSV", desc: "Drag & drop your CSV file. Any size, any structure.", icon: "📁" },
              { step: "02", title: "AI Analyzes", desc: "Three AI agents clean, analyze, and synthesize insights.", icon: "🤖" },
              { step: "03", title: "Get Insights", desc: "Receive charts, forecasts, and actionable recommendations.", icon: "✨" },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="relative text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-blue-500/40 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 text-3xl mb-4 float-animation" style={{ animationDelay: `${i * 0.5}s` }}>
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-blue-400 mb-2 tracking-widest">{item.step}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 py-24 md:px-8">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20" />
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="relative border border-blue-500/20 rounded-3xl p-10 md:p-16 text-center backdrop-blur-sm">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-6"
              >
                <Sparkles className="w-10 h-10 text-blue-400" />
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Ready to unlock your data's potential?
              </h2>
              <p className="text-slate-300 mb-8 max-w-xl mx-auto">
                Join analysts using AURA to transform raw CSV files into strategic intelligence — no setup required.
              </p>
              <button
                onClick={onGetStarted}
                className="glow-button text-base"
              >
                <span className="flex items-center gap-2">
                  Start Free Analysis <ArrowRight className="w-5 h-5" />
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 px-4 py-8 md:px-8">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-300">AURA Analyst</span>
          </div>
          <p className="text-sm text-slate-500">
            © 2026 AURA Analyst. Powered by{" "}
            <span className="text-blue-400">AWS Bedrock</span> &{" "}
            <span className="text-purple-400">Claude AI</span>.
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="https://github.com/Tanmay2504/AURA-Analyst" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
