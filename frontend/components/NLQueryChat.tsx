"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

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
  "What is the average value across all columns?",
  "Which category has the highest count?",
  "Are there any outliers in the data?",
  "What is the overall trend?",
  "Which column has the most missing values?",
  "What are the top 3 insights from this dataset?",
];

export default function NLQueryChat({ analysisId, filename }: NLQueryChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `AURA analyst ready. Ask me anything about ${filename || "your dataset"} — trends, statistics, comparisons, anomalies.`,
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
      const answer = res.ok ? data.answer : (data.detail || "Query failed.");
      setMessages((prev) => [...prev, { role: "assistant", content: answer, timestamp: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Is the backend running?", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuestion(input); }
  };

  return (
    <div className="w-full space-y-3">
      {/* Suggested questions */}
      <div>
        <div className="font-mono text-[10px] text-[#3d3a2e] uppercase tracking-widest mb-2">// suggested queries</div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button key={i} onClick={() => sendQuestion(q)}
              className="font-mono text-[10px] border border-[#2a2a1e] px-2 py-1 text-[#7a7060] hover:border-[#f97316]/40 hover:text-[#f97316] transition-all">
              {q.length > 40 ? q.slice(0, 40) + '…' : q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat messages */}
      <div className="border border-[#2a2a1e] bg-[#0a0a08] h-72 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`font-mono text-[10px] flex-shrink-0 w-5 text-center mt-0.5
              ${msg.role === "user" ? "text-[#f97316]" : "text-[#4ade80]"}`}>
              {msg.role === "user" ? ">" : "$"}
            </div>
            <div className={`max-w-[85%] border p-2.5
              ${msg.role === "user"
                ? "border-[#f97316]/30 bg-[#f97316]/5"
                : "border-[#2a2a1e] bg-[#0f0f0b]"}`}>
              <p className="font-mono text-xs text-[#e8e0cc] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className="font-mono text-[9px] text-[#3d3a2e] mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="font-mono text-[10px] text-[#4ade80] w-5 text-center mt-0.5">$</div>
            <div className="border border-[#2a2a1e] bg-[#0f0f0b] p-2.5">
              <span className="font-mono text-xs text-[#f97316]">
                analyzing<span className="blink">█</span>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center border border-[#2a2a1e] bg-[#0a0a08] hover:border-[#f97316]/40 transition-all">
          <span className="font-mono text-xs text-[#f97316] px-3 flex-shrink-0">{">"}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ask anything about your data..."
            disabled={loading}
            className="flex-1 bg-transparent font-mono text-xs text-[#e8e0cc] placeholder-[#3d3a2e] outline-none py-2.5 pr-3"
          />
        </div>
        <button
          onClick={() => sendQuestion(input)}
          disabled={loading || !input.trim()}
          className="border border-[#f97316] px-3 py-2.5 text-[#f97316] hover:bg-[#f97316] hover:text-[#0a0a08] transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
