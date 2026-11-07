import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Leaf } from "lucide-react";
import { mockReply, starterPrompts, type ChatMessage } from "@/lib/mock-data";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant — Steady" },
      { name: "description", content: "Chat with a calm assistant that breaks work into small, doable steps." },
      { property: "og:title", content: "Assistant — Steady" },
      { property: "og:description", content: "A calm AI study companion for students with ADHD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [thinking]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  function send(text: string) {
    const t = text.trim();
    if (!t || thinking) return;
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text: t }]);
    setInput("");
    setThinking(true);
    // TODO: replace with Google ADK backend call.
    setTimeout(() => {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: mockReply(t) }]);
      setThinking(false);
    }, 900);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col px-6 md:h-screen md:px-10">
      <div className="flex-1 overflow-y-auto py-10" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><Leaf className="h-7 w-7" aria-hidden /></span>
            <h1 className="mt-4 text-3xl font-medium">What's on your mind?</h1>
            <p className="mt-2 max-w-sm text-muted-foreground">No pressure. Tell me what you're working on and we'll find one small step.</p>
            <div className="mt-8 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {starterPrompts.map((p) => (
                <button key={p} onClick={() => send(p)} className="rounded-xl border border-border bg-card p-3 text-left text-sm hover:bg-muted">{p}</button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-6">
            {messages.map((m) => (
              <li key={m.id} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
                {m.role === "assistant" && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Leaf className="h-4 w-4" aria-hidden /></span>}
                <p className={`whitespace-pre-line leading-relaxed ${m.role === "user" ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "pt-1"}`}>
                  <span className="sr-only">{m.role === "user" ? "You: " : "Steady: "}</span>{m.text}
                </p>
              </li>
            ))}
            {thinking && (
              <li className="flex gap-3" aria-label="Steady is typing">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Leaf className="h-4 w-4" aria-hidden /></span>
                <span className="flex items-center gap-1 pt-1">
                  {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 150}ms` }} />)}
                </span>
              </li>
            )}
            <div ref={endRef} />
          </ul>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mb-6 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft">
        <label htmlFor="msg" className="sr-only">Message</label>
        <textarea
          id="msg" ref={inputRef} rows={1} value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Type a message…"
          className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" disabled={!input.trim() || thinking} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">
          <ArrowUp className="h-5 w-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
