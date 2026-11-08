import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Check, CheckCircle2, ChevronDown, Leaf, Maximize2, MessageCircle, PartyPopper, RefreshCw } from "lucide-react";
import { currentStep, currentStepTitle } from "@/lib/mock-data";
import { sendToAdk, getAdkTaskPlan } from "@/lib/adk-client";
import { useTasks } from "@/lib/task-context";
import { EmphasizedText } from "@/components/EmphasizedText";
import { Button } from "@/components/ui/button";
import { ConversationHistory } from "@/components/ConversationHistory";
import { ConversationNavigation } from "@/components/ConversationNavigation";

export const Route = createFileRoute("/tasks/$taskId")({
  validateSearch: (search: Record<string, unknown>): { chat?: boolean } => search['chat'] === true || search['chat'] === "true" ? { chat: true } : {},
  head: () => ({
    meta: [
      { title: "Task workspace — Steady" },
      { name: "description", content: "Focus on one small step while keeping every project and conversation within reach." },
      { property: "og:title", content: "Task workspace — Steady" },
      { property: "og:description", content: "A calm, independent workspace for each task." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TaskWorkspace,
});

function TaskWorkspace() {
  const { taskId } = Route.useParams();
  const { chat: expandedChat } = Route.useSearch();
  const { tasks, appendMessage, syncProgress } = useTasks();
  const task = tasks.find((item) => item.id === taskId);
  const [showRemaining, setShowRemaining] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [task?.messages.length]);
  if (!task) throw notFound();

  const step = currentStep(task);
  const completed = task.completedStepIds.length;
  const progress = task.steps.length ? Math.round((completed / task.steps.length) * 100) : 0;
  const currentIndex = step ? task.steps.findIndex((item) => item.id === step.id) : -1;
  const remaining = currentIndex >= 0 ? task.steps.slice(currentIndex + 1) : [];
  
  async function handleComplete() {
    if (!step || completing) return;

    setCompleting(true);

    try {
      const reply = await sendToAdk(
        taskId,
        "I have completed the current step. Mark it as completed and show only the next step. Respond in the language of our conversation."
      );

      appendMessage(taskId, {
        id: crypto.randomUUID(),
        role: "assistant",
        text: reply,
      });

      const plan = await getAdkTaskPlan(taskId);

      // Actualizar el frontend solo si ADK confirmó el paso.
      if (plan?.completed_steps.includes(currentIndex)) {
        syncProgress(
          taskId,
          plan.completed_steps.map((index) => `step-${index}`)
        );
      } else {
        alert("El agente todavía no confirmó este paso. Inténtalo nuevamente.");
      }
    } catch (error) {
      console.error("Error completing step:", error);
      alert("No se pudo actualizar el progreso. Inténtalo nuevamente.");
    } finally {
      setCompleting(false);
    }
  }


  
  async function submit(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    appendMessage(taskId, {
      id: crypto.randomUUID(),
      role: "user",
      text,
    });

    try {
      const reply = await sendToAdk(taskId, text);
      const plan = await getAdkTaskPlan(taskId);

      if (plan) {
        syncProgress(
          taskId,
          plan.completed_steps.map((index) => `step-${index}`)
        );
      }

      appendMessage(taskId, {
        id: crypto.randomUUID(),
        role: "assistant",
        text: reply,
      });
    } catch (error) {
      console.error("Error connecting task chat to ADK:", error);

      appendMessage(taskId, {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "No pude conectarme con el asistente. Inténtalo nuevamente.",
      });
    } finally {
      setSending(false);
    }
  }


  return (
    <div className={expandedChat ? "mx-auto flex h-[calc(100dvh-8rem)] min-h-[24rem] max-w-6xl md:h-dvh" : "mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-8"}>
      {expandedChat && <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar lg:block" aria-labelledby="project-conversations"><ConversationHistory headingId="project-conversations" selectedTaskId={taskId} /></aside>}
      <div className={expandedChat ? "flex min-w-0 flex-1 flex-col" : ""}>
      {!expandedChat && <>
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to today
      </Link>
      <header className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">{task.course} · {task.due}</p>
          <h1 className="mt-2 text-3xl font-medium md:text-4xl">{task.title}</h1>
          {task.objective !== task.title && <p className="mt-3 leading-relaxed text-muted-foreground">{task.objective}</p>}
        </div>
        <div className="shrink-0 md:text-right">
          <p className="text-sm font-medium">{step ? `${completed} of ${task.steps.length} steps completed` : "Task complete"}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted md:w-48" role="progressbar" aria-label="Task progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>
      </>}

      <div className={expandedChat ? "flex min-h-0 flex-1 flex-col" : "mt-8 grid items-start gap-6 xl:grid-cols-5"}>
        {!expandedChat && <div className="space-y-6 xl:col-span-3">
          <section className="bg-secondary p-6 text-secondary-foreground md:p-8" aria-labelledby="current-action">
            <p className="text-sm font-medium uppercase tracking-wide opacity-75">{step ? "Your current step" : "All finished"}</p>
            {step ? (
              <>
                <h2 id="current-action" className="mt-3 max-w-xl font-display text-2xl leading-snug md:text-3xl">{currentStepTitle(task)}</h2>
                {task.alternativeStepId === step.id && <p className="mt-2 text-sm opacity-75">Same objective, a different way in.</p>}
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button onClick={handleComplete} disabled={completing || sending} className="h-11 rounded-xl px-5">
                    <Check className="h-4 w-4" aria-hidden /> {completing ? "Confirming…" : "Done"}
                  </Button>
                  <Button variant="outline" onClick={() =>  submit("No quiero realizar el paso actual de esta manera. Propón una sola alternativa pequeña y concreta que ayude a cumplir el mismo objetivo. Espera mi confirmación.")}
                    disabled={sending || completing} className="h-11 rounded-xl bg-card px-4">
                    <RefreshCw className="h-4 w-4" aria-hidden /> Try another way
                  </Button>
                  <Button variant="ghost" onClick={() => { inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="h-11 rounded-xl px-4">
                    <MessageCircle className="h-4 w-4" aria-hidden /> I need help
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-4 flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-primary"><PartyPopper className="h-6 w-6" aria-hidden /></span>
                <div><h2 id="current-action" className="font-display text-2xl">You did it!</h2><p className="mt-1 text-sm opacity-80">Every step is complete. Be proud of your progress.</p></div>
              </div>
            )}
          </section>

          <section className="border-t border-border px-2 py-6" aria-labelledby="steps-title">
            <h2 id="steps-title" className="text-lg font-medium">Your steps</h2>
            {completed > 0 ? (
              <ol className="mt-4 space-y-3">
                {task.steps.filter((item) => task.completedStepIds.includes(item.id)).map((item) => (
                  <li key={item.id} className="flex items-start gap-3 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <span>{item.title}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-3 text-sm text-muted-foreground">Completed steps will appear here.</p>}
            {remaining.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <Button variant="ghost" onClick={() => setShowRemaining((value) => !value)} aria-expanded={showRemaining} className="h-11 w-full justify-between whitespace-normal px-0 text-left">
                  Remaining steps <span className="flex items-center gap-2 text-muted-foreground">{remaining.length}<ChevronDown className={`h-4 w-4 transition-transform ${showRemaining ? "rotate-180" : ""}`} aria-hidden /></span>
                </Button>
                {showRemaining && <ol className="mt-4 space-y-3 pl-1 text-sm text-muted-foreground">{remaining.map((item) => <li key={item.id} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />{item.title}</li>)}</ol>}
              </div>
            )}
          </section>
        </div>}

        <section id="task-conversation" className={expandedChat ? "flex min-h-0 flex-1 flex-col bg-background" : "flex h-[36rem] min-w-0 scroll-mt-6 flex-col rounded-2xl border border-border bg-card shadow-soft xl:sticky xl:top-6 xl:col-span-2 xl:h-[calc(100dvh-3rem)]"} aria-labelledby="conversation-title">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              {expandedChat && <ConversationNavigation selectedTaskId={taskId} />}
              <div className="min-w-0"><h2 id="conversation-title" className="text-lg font-medium">{expandedChat ? task.title : "Task assistant"}</h2>
              {expandedChat && <p className="mt-1 text-xs text-muted-foreground">{completed}/{task.steps.length} steps completed</p>}</div>
            </div>
            <Button asChild variant="ghost" size={expandedChat ? "default" : "icon"} className="h-11 shrink-0 rounded-xl" title={expandedChat ? "Back to task" : "Expand conversation"}>
              <Link to="/tasks/$taskId" params={{ taskId }} search={expandedChat ? {} : { chat: true }} aria-label={expandedChat ? "Back to task" : "Expand conversation"}>
                {expandedChat ? <><ArrowLeft aria-hidden /><span className="hidden sm:inline">Back to task</span></> : <Maximize2 aria-hidden />}
              </Link>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite"><div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
            {task.messages.length === 0 && <div className="py-8 text-center"><Leaf className="mx-auto h-6 w-6 text-primary" aria-hidden /><p className="mt-3 text-sm text-muted-foreground">Stuck on this step? Tell me what feels difficult.</p></div>}
            {task.messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-8 rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground" : "mr-3 p-2 text-sm"}>
                {message.role === "assistant" && <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">One small step</p>}
                <p className="whitespace-pre-line leading-relaxed"><EmphasizedText text={message.text} /></p>
              </div>
            ))}
            {(sending || completing) && <p role="status" className="text-sm text-muted-foreground">Steady is thinking…</p>}
            <div ref={endRef} />
          </div>
          </div>
          <div className="mx-auto w-full max-w-3xl shrink-0 p-4"><form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex items-end gap-2 rounded-xl border border-border bg-card p-2">
            <label htmlFor="task-message" className="sr-only">Ask for help with this task</label>
            <textarea ref={inputRef} id="task-message" rows={2} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="What feels difficult?" className="max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground" />
            <Button type="submit" size="icon" disabled={!input.trim() || sending || completing} aria-label="Send message" className="h-11 w-11 shrink-0 rounded-xl"><ArrowUp aria-hidden /></Button>
          </form></div>
        </section>
      </div>
      </div>
    </div>
  );
}
