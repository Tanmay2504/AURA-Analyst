"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, MessageSquare, Sparkles } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface NLQueryChatProps {
  analysisId: number;
  filename?: string;
}

const SUGGESTED_QUESTIONS = [
  "What is the average score across all subjects?",
  "Which city has the highest performing students?",
  "How many students have attendance above 90%?",
  "What percentage of students received a scholarship?",
  "Which subject has the lowest average marks?",
  "How many students are currently active vs suspended?",
];

export default function NLQueryChat({ analysisId, filename }: NLQueryChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm your AI data analyst. Ask me anything about **${filename || "your dataset"}** — I can answer questions about trends, statistics, comparisons, and more.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuestion = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: Message = { role: "user", content: question, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/query/${analysisId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const answer = res.ok ? data.answer : (data.detail || "Sorry, I couldn't answer that.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/50 bg-slate-800/60">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Ask Your Data</h3>
          <p className="text-xs text-slate-400">Natural language queries powered by AI</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" style={{ maxHeight: "380px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                msg.role === "assistant"
                  ? "bg-gradient-to-br from-violet-500 to-blue-500"
                  : "bg-gradient-to-br from-blue-500 to-cyan-500"
              }`}
            >
              {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-slate-800 text-slate-200 rounded-tl-sm"
                  : "bg-blue-600 text-white rounded-tr-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-slate-400 text-sm">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Suggested questions
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => sendQuestion(q)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600/50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-700/50">
        <form
          onSubmit={(e) => { e.preventDefault(); sendQuestion(input); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your data..."
            className="flex-1 bg-slate-800 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
