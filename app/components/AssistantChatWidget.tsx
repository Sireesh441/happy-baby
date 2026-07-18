"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Product } from "../data/products";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    'Hi! Tell me what you\'re looking for and I\'ll suggest a few products — e.g. "I need something for a 6-month-old with sensitive skin."',
};

function renderReplyWithLinks(reply: string, products: Product[]): ReactNode {
  if (products.length === 0) {
    return reply;
  }

  const sorted = [...products].sort((a, b) => b.name.length - a.name.length);
  const escaped = sorted.map((p) => p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = reply.split(pattern);

  return parts.map((part, index) => {
    const product = sorted.find((p) => p.name === part);
    if (product) {
      return (
        <Link
          key={index}
          href={`/shop/${product.id}`}
          className="font-semibold text-pink-500 underline decoration-pink-300 underline-offset-2 hover:text-pink-600"
        >
          {part}
        </Link>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function AssistantChatWidget() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && products.length === 0) {
      fetch("/api/products")
        .then((response) => response.json())
        .then(setProducts)
        .catch(() => setProducts([]));
    }
  }, [open, products.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-112 w-80 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between bg-pink-500 px-4 py-3 text-white">
            <p className="font-semibold">Ask HappyBaby</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-lg leading-none"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-pink-500 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {message.role === "assistant"
                    ? renderReplyWithLinks(message.content, products)
                    : message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-400">
                  Thinking...
                </div>
              </div>
            )}
            {error && <p className="text-center text-xs font-medium text-red-500">{error}</p>}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g. sensitive skin for a newborn"
              className="flex-1 rounded-full border-2 border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-600 disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-500 text-2xl text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
