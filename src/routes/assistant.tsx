import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Leaf } from "lucide-react";
import { starterPrompts, type ChatMessage } from "@/lib/mock-data";
import { sendToAdk, getAdkTaskPlan } from "@/lib/adk-client";
import { useTasks } from "@/lib/task-context";
import { EmphasizedText } from "@/components/EmphasizedText";
import { ConversationHistory } from "@/components/ConversationHistory";
import { ConversationNavigation } from "@/components/ConversationNavigation";
import { Button } from "@/components/ui/button";
import { TimingEditor } from "@/components/TimingEditor";
import { TaskActions } from "@/components/TaskActions";
import { type Timing } from "@/lib/task-details";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant — Steady" },
      {
        name: "description",
        content:
          "Chat with a calm assistant that breaks work into small, doable steps.",
      },
      { property: "og:title", content: "Assistant — Steady" },
      {
        property: "og:description",
        content: "One encouraging, actionable step at a time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

function Assistant() {
  const { tasks, addTask, runAction, goals } = useTasks();
  const [timing, setTiming] = useState<Timing>();
  const [goalId, setGoalId] = useState("");
  const [error, setError] = useState("");
  const sendLock = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Cada nueva conversación utiliza una sesión independiente de ADK.
  // Se conserva mientras este componente permanezca abierto.
  const sessionIdRef = useRef("");
  const activeTask = tasks.find((task) => task.id === sessionIdRef.current);
  const visibleMessages = activeTask?.messages ?? messages;

  useEffect(() => {
    inputRef.current?.focus();
  }, [thinking]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTask?.messages.length, thinking]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendLock.current) return;
    if (!sessionIdRef.current) sessionIdRef.current = `task_${crypto.randomUUID()}`;
    sendLock.current = true; setThinking(true); setError("");
    try {
      if (activeTask) {
        if (await runAction(activeTask.id, "chat", trimmed)) setInput("");
        else setInput(trimmed);
        return;
      }
      const reply = await sendToAdk(sessionIdRef.current, trimmed, { intent: "chat", goal: goals.find((g) => g.id === goalId) ?? null, project: { timing: timing ?? null }, operation_id: crypto.randomUUID() });
      const plan = await getAdkTaskPlan(sessionIdRef.current);
      const nextMessages: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", text: trimmed }, { id: crypto.randomUUID(), role: "assistant", text: reply }];
      setMessages(nextMessages);
      if (plan) {
        addTask({ id: sessionIdRef.current, title: plan.goal, course: "General", due: "No deadline", timing: timing ?? plan.timing, goalId: goalId || undefined, minutes: 15, objective: plan.goal, steps: plan.steps.map((title, i) => ({ id: `step-${i}`, title })), completedStepIds: [], actionState: plan.action_state ?? "accepted", messages: nextMessages });
      }
      setInput("");
    } catch {
      setError("Could not reach the assistant. Your message is still here; please retry."); setInput(trimmed);
    } finally { sendLock.current = false; setThinking(false); }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] min-h-[24rem] max-w-6xl md:h-dvh">
      <aside
        aria-labelledby="desktop-conversation-history"
        className="hidden w-60 shrink-0 border-r border-border bg-sidebar lg:block"
      >
        <ConversationHistory headingId="desktop-conversation-history" />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col" aria-label="Assistant conversation">
        <div className="border-b border-border px-4 py-3 lg:hidden">
          <ConversationNavigation />
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-6 md:px-10">
          <div
             className="min-h-0 flex-1 overflow-y-auto py-6"
            aria-live="polite"
          >
            {visibleMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                  <Leaf className="h-7 w-7" aria-hidden />
                </span>

                <h1 className="mt-4 text-3xl font-medium">
                  What's on your mind?
                </h1>

                <p className="mt-2 max-w-sm text-muted-foreground">
                  No pressure. Tell me what you're working on and
                  we'll find one small step.
                </p>

                <div className="mt-8 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                  {starterPrompts.map((prompt) => (
                     <Button variant="outline"
                      key={prompt}
                      onClick={() => send(prompt)}
                      disabled={thinking}
                       className="h-auto min-h-11 whitespace-normal rounded-xl bg-card p-3 text-left text-sm"
                    >
                      {prompt}
                     </Button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="space-y-6">
                {visibleMessages.map((message) => (
                  <li
                    key={message.id}
                    className={
                      message.role === "user"
                        ? "flex justify-end"
                        : "flex gap-3"
                    }
                  >
                    {message.role === "assistant" && (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                        <Leaf className="h-4 w-4" aria-hidden />
                      </span>
                    )}

                    {message.role === "user" ? (
                      <p className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
                        <span className="sr-only">You: </span>
                        {message.text}
                      </p>
                    ) : (
                      <div className="max-w-xl flex-1 rounded-2xl border border-border bg-card p-5 shadow-soft">
                        <p className="text-xs font-medium uppercase tracking-wide text-primary">
                          Your one next step
                        </p>

                        <p className="mt-3 whitespace-pre-line leading-relaxed">
                          <span className="sr-only">Steady: </span>
                          <EmphasizedText text={message.text} />
                        </p>
                      </div>
                    )}
                  </li>
                ))}

                {thinking && (
                  <li
                    className="flex gap-3"
                    aria-label="Steady is typing"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                      <Leaf className="h-4 w-4" aria-hidden />
                    </span>

                    <span className="flex items-center gap-1 pt-1">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                             className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none"
                          style={{
                            animationDelay: `${index * 150}ms`,
                          }}
                        />
                      ))}
                    </span>
                  </li>
                )}

                <div ref={endRef} />
              </ul>
            )}
          </div>

          {activeTask ? <div className="mb-3"><TaskActions task={activeTask} onHelp={() => inputRef.current?.focus()} /></div> : <div className="mb-3"><TimingEditor value={timing} onSave={setTiming} label="Project timing" />{goals.length > 0 && <label className="mt-2 flex flex-col gap-1 text-sm">Parent goal<select aria-label="Parent goal" value={goalId} onChange={(e) => setGoalId(e.target.value)} className="h-11 rounded-md border border-input bg-background px-2"><option value="">Independent project</option>{goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>}</div>}
          {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="mb-6 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft"
          >
            <label htmlFor="message" className="sr-only">
              Message
            </label>

            <textarea
              id="message"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              placeholder="Type a message…"
              className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground"
            />

            <Button size="icon"
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label="Send"
              className="h-11 w-11 shrink-0 rounded-xl"
            >
              <ArrowUp className="h-5 w-5" aria-hidden />
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
