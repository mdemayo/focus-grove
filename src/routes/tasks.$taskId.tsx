import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Check, CheckCircle2, ChevronDown, Leaf, MessageCircle, PartyPopper, RefreshCw } from "lucide-react";
import { currentStep, currentStepTitle } from "@/lib/mock-data";
import { sendToAdk, getAdkTaskPlan } from "@/lib/adk-client";
import { useTasks } from "@/lib/task-context";
import { EmphasizedText } from "@/components/EmphasizedText";

export const Route = createFileRoute("/tasks/$taskId")({
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
  const { tasks, appendMessage, syncProgress } = useTasks();
  const task = tasks.find((item) => item.id === taskId);
  const [showRemaining, setShowRemaining] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [task?.messages.length]);
  if (!task) throw notFound();

  const step = currentStep(task);
  const completed = task.completedStepIds.length;
  const progress = Math.round((completed / task.steps.length) * 100);
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
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to today
      </Link>
      <header className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">{task.course} · {task.due}</p>
          <h1 className="mt-2 text-3xl font-medium md:text-4xl">{task.title}</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{task.objective}</p>
        </div>
        <div className="shrink-0 md:text-right">
          <p className="text-sm font-medium">{step ? `${completed} of ${task.steps.length} steps completed` : "Task complete"}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted md:w-48" role="progressbar" aria-label="Task progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-2xl bg-secondary p-6 text-secondary-foreground shadow-soft md:p-8" aria-labelledby="current-action">
            <p className="text-sm font-medium uppercase tracking-wide opacity-75">{step ? "Your current step" : "All finished"}</p>
            {step ? (
              <>
                <h2 id="current-action" className="mt-3 max-w-xl font-display text-2xl leading-snug md:text-3xl">{currentStepTitle(task)}</h2>
                {task.alternativeStepId === step.id && <p className="mt-2 text-sm opacity-75">Same objective, a different way in.</p>}
                <div className="mt-7 flex flex-wrap gap-3">
                  <button onClick={handleComplete} disabled={completing} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                    <Check className="h-4 w-4" aria-hidden /> Done
                  </button>
                  <button onClick={() =>  submit("No quiero realizar el paso actual de esta manera. Propón una sola alternativa pequeña y concreta que ayude a cumplir el mismo objetivo. Espera mi confirmación.")}
                    disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
                    <RefreshCw className="h-4 w-4" aria-hidden /> Try another way
                  </button>
                  <a href="#task-conversation" className="inline-flex items-center gap-2 rounded-xl border border-secondary-foreground/20 px-4 py-2.5 text-sm font-medium hover:bg-card/50">
                    <MessageCircle className="h-4 w-4" aria-hidden /> I need help
                  </a>
                </div>
              </>
            ) : (
              <div className="mt-4 flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-primary"><PartyPopper className="h-6 w-6" aria-hidden /></span>
                <div><h2 id="current-action" className="font-display text-2xl">You did it!</h2><p className="mt-1 text-sm opacity-80">Every step is complete. Be proud of your progress.</p></div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft" aria-labelledby="steps-title">
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
                <button onClick={() => setShowRemaining((value) => !value)} aria-expanded={showRemaining} className="flex w-full items-center justify-between text-left text-sm font-medium">
                  Remaining steps <span className="flex items-center gap-2 text-muted-foreground">{remaining.length}<ChevronDown className={`h-4 w-4 transition-transform ${showRemaining ? "rotate-180" : ""}`} aria-hidden /></span>
                </button>
                {showRemaining && <ol className="mt-4 space-y-3 pl-1 text-sm text-muted-foreground">{remaining.map((item) => <li key={item.id} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />{item.title}</li>)}</ol>}
              </div>
            )}
          </section>
        </div>

        <section id="task-conversation" className="flex min-h-[32rem] scroll-mt-6 flex-col rounded-2xl border border-border bg-card shadow-soft lg:sticky lg:top-6 lg:col-span-2 lg:h-[calc(100vh-3rem)]" aria-labelledby="conversation-title">
          <div className="border-b border-border p-5">
            <h2 id="conversation-title" className="text-lg font-medium">Task assistant</h2>
            <p className="mt-1 text-xs text-muted-foreground">This conversation stays with this task.</p>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5" aria-live="polite">
            {task.messages.length === 0 && <div className="py-8 text-center"><Leaf className="mx-auto h-6 w-6 text-primary" aria-hidden /><p className="mt-3 text-sm text-muted-foreground">Stuck on this step? Tell me what feels difficult.</p></div>}
            {task.messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-8 rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground" : "mr-3 rounded-2xl border border-border bg-background p-4 text-sm"}>
                {message.role === "assistant" && <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">One small step</p>}
                <p className="whitespace-pre-line leading-relaxed"><EmphasizedText text={message.text} /></p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="m-4 mt-0 flex items-end gap-2 rounded-xl border border-border bg-background p-2">
            <label htmlFor="task-message" className="sr-only">Ask for help with this task</label>
            <textarea id="task-message" rows={2} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="What feels difficult?" className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground" />
            <button type="submit" disabled={!input.trim()} aria-label="Send message" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"><ArrowUp className="h-4 w-4" aria-hidden /></button>
          </form>
        </section>
      </div>
    </div>
  );
}
