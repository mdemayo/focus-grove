import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Check, CheckCircle2, ChevronDown, Leaf, Maximize2, MessageCircle, PartyPopper, RefreshCw } from "lucide-react";
import { currentStep, currentStepTitle } from "@/lib/mock-data";
import { TaskActions } from "@/components/TaskActions";
import { TimingEditor } from "@/components/TimingEditor";
import { ProjectGoalEditor, GoalOverview } from "@/components/GoalConnections";
import { timingLabel } from "@/lib/task-details";
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
  const { tasks, goals, runAction, pending, errors, saveTiming, ready } = useTasks();
  const task = tasks.find((item) => item.id === taskId);
  const [showRemaining, setShowRemaining] = useState(false);
  const [input, setInput] = useState("");
  const sending = !!pending[taskId];
  const completing = false;
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [task?.messages.length]);
  if (!ready) return <p role="status" className="p-6">Restoring your projects…</p>;
  if (!task) throw notFound();

  const step = currentStep(task);
  const completed = task.completedStepIds.length;
  const progress = task.steps.length ? Math.round((completed / task.steps.length) * 100) : 0;
  const currentIndex = step ? task.steps.findIndex((item) => item.id === step.id) : -1;
  const remaining = currentIndex >= 0 ? task.steps.slice(currentIndex + 1) : [];
  
  async function submit(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    if (await runAction(taskId, "chat", text)) setInput("");
  }
  const parentGoal = goals.find((goal) => goal.id === task.goalId);

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
          <p className="text-sm font-medium text-primary">{task.course} · {timingLabel(task)}</p>
          <h1 className="mt-2 text-3xl font-medium md:text-4xl">{task.title}</h1>
          {parentGoal && <p className="mt-2 text-sm text-muted-foreground">Goal: {parentGoal.title}{task.contribution && <> · {task.contribution}</>}</p>}
          <div className="mt-2 flex flex-wrap gap-3"><TimingEditor value={task.timing} onSave={(timing) => saveTiming(task.id, timing)} label="Edit timing" /><ProjectGoalEditor task={task} /></div>
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
                <p className="mt-2 text-xs text-muted-foreground">Project timing: {timingLabel(task)}</p>
                <div className="mt-6"><TaskActions task={task} onHelp={() => { inputRef.current?.focus(); inputRef.current?.scrollIntoView({ block: "center" }); }} /></div>
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
          {parentGoal && !step && <GoalOverview />}
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
          <div className="mx-auto w-full max-w-3xl shrink-0 p-4">
            {step && <div className="mb-3"><p className="mb-2 text-sm font-medium">{currentStepTitle(task)}</p><TaskActions task={task} onHelp={() => inputRef.current?.focus()} /></div>}
            {!step && parentGoal && <div className="max-h-64 overflow-y-auto"><GoalOverview /></div>}
            {!step && errors[taskId] && <p role="alert" className="mb-2 text-sm text-destructive">{errors[taskId]}</p>}
            <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex items-end gap-2 rounded-xl border border-border bg-card p-2">
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
