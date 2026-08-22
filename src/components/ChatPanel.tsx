"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

/**
 * Additive AI widget — a dismissible panel, not required to browse/filter/view universities.
 * Talks to /api/chat, which runs the tool-calling agent in src/lib/ai/agent.ts.
 */
export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I can help you pick a university, compare options, or explain admission requirements. What are you looking for?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : `Error: ${data.error}`;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // bottom-20, not bottom-6: Netlify injects a "Powered by Netlify" badge (#nl-badge-frame) as a
  // fixed 202x64 iframe pinned to the bottom-right at z-index 2147483645 — near the max int, so
  // outranking it isn't practical and would overlap it visually anyway. 5rem clears the badge's
  // 64px height with a 16px gap (measured identically on desktop and mobile viewports).
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-50 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700"
      >
        Ask UniGuide
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-6 z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96">
      <div className="flex items-center justify-between border-b border-slate-200 bg-indigo-600 px-4 py-3">
        <span className="text-sm font-semibold text-white">UniGuide assistant</span>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="Close chat">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-800"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-slate-400">Thinking…</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. compare MIT and NU"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
