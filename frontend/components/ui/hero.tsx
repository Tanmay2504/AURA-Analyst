"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Zap, Database } from "lucide-react";

export default function AuraHero() {
  const features = [
    {
      icon: BarChart3,
      title: "Instant Analysis",
      description: "Upload CSV, get AI-powered insights in seconds",
    },
    {
      icon: TrendingUp,
      title: "Smart Visualizations",
      description: "Auto-generated charts from your data",
    },
    {
      icon: Database,
      title: "Data Persistence",
      description: "All analyses saved for future reference",
    },
    {
      icon: Zap,
      title: "AI-Powered",
      description: "Powered by Google's Gemini API",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute right-0 top-0 h-1/2 w-1/2">
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(circle at 70% 30%, rgba(59, 130, 246, 0.15) 0%, rgba(15, 23, 42, 0) 60%)",
            }}
          />
        </div>
        <div className="absolute left-0 top-0 h-1/2 w-1/2 -scale-x-100">
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(circle at 70% 30%, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0) 60%)",
            }}
          />
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 px-4 py-20 md:py-32">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Badge */}
            <motion.div
              className="mb-8 inline-block"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
                ✨ Welcome to AURA Analyst
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              className="mx-auto mb-6 max-w-4xl text-5xl font-bold tracking-tight text-white md:text-7xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              Transform Your Data Into{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent">
                Actionable Insights
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              className="mx-auto mb-10 max-w-2xl text-lg text-slate-300 md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Upload your CSV files and harness the power of AI-driven analysis. Get instant insights, beautiful visualizations, and comprehensive data summaries—all in one place.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="mb-16 flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Link
                href="#analyzer"
                className="neumorphic-button group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-blue-500/30 bg-gradient-to-br from-blue-600 to-blue-800 px-8 py-4 font-semibold text-white shadow-xl transition-all duration-300 hover:border-blue-400/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Analyzing
                  <Zap className="h-4 w-4" />
                </span>
              </Link>
              <Link
                href="#features"
                onClick={(event) => event.stopPropagation()}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-slate-600 px-8 py-4 font-semibold text-slate-200 transition-all duration-300 hover:border-purple-400 hover:text-white"
              >
                Learn More
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform group-hover:translate-y-1"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </Link>
            </motion.div>

            {/* Dashboard Preview */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-700 shadow-2xl">
                <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900">
                  <Image
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop"
                    alt="AURA Analyst Dashboard"
                    width={1920}
                    height={1080}
                    className="h-full w-full object-cover opacity-70"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="mx-auto mb-4 h-16 w-16 text-blue-400/80" />
                      <p className="text-slate-300">AI-Powered Data Analysis</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 rounded-2xl shadow-[0_0_60px_rgba(59,130,246,0.2)]" />
            </motion.div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            id="features"
            className="mt-24 grid gap-8 md:grid-cols-2 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  className="group rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/50 hover:bg-slate-700/50"
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                >
                  <div className="mb-4 inline-flex rounded-lg bg-blue-600/20 p-3 text-blue-400 transition-all group-hover:bg-blue-600/30">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="relative z-10 px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="rounded-2xl border border-gradient-to-r from-blue-500/30 to-purple-500/30 bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-8 text-center backdrop-blur-sm md:p-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Ready to unlock your data's potential?
            </h2>
            <p className="mb-8 text-slate-300">
              Join thousands of data analysts using AURA to transform raw data into strategic intelligence.
            </p>
            <Link
              href="#analyzer"
              onClick={(event) => event.stopPropagation()}
              className="inline-block rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
            >
              Start Free Analysis
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700 px-4 py-8">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center text-slate-400">
            <p>
              AURA Analyst © 2026. Powered by{" "}
              <span className="text-blue-400">Gemini AI</span> and built for modern data teams.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
