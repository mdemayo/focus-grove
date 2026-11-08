import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Clock, MapPin, Pause, Play, RotateCcw, Smile } from "lucide-react";
import { currentStep, currentStepTitle, schedule, weekFocus } from "@/lib/mock-data";
import { useTasks } from "@/lib/task-context";
import { Button } from "@/components/ui/button";
import { TaskActions } from "@/components/TaskActions";
import { GoalOverview } from "@/components/GoalConnections";
import { TimingEditor } from "@/components/TimingEditor";
import { orderedTaskIds, deadlineState, timingLabel } from "@/lib/task-details";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Steady" },
      { name: "description", content: "Your calm daily overview: one small step per project, a short task list and a gentle timer." },
      { property: "og:title", content: "Today — Steady" },
      { property: "og:description", content: "Progress at your own pace, one step at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const card = "rounded-2xl border border-border bg-card p-6 shadow-soft";

function FocusTimer() {
  const total = 25 * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setLeft((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const minutes = String(Math.floor(left / 60)).padStart(2, "0");
  const seconds = String(left % 60).padStart(2, "0");
  const progress = ((total - left) / total) * 100;
  return (
    <section className={card} aria-labelledby="timer-heading">
      <h2 id="timer-heading" className="text-lg font-medium">Focus timer</h2>
      <p className="mt-6 text-center font-display text-6xl font-medium tabular-nums" aria-live="polite">{minutes}:{seconds}</p>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Focus progress"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={() => setRunning((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">{running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}{running ? "Pause" : "Start"}</button>
        <button onClick={() => { setRunning(false); setLeft(total); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"><RotateCcw className="h-4 w-4" aria-hidden /> Reset</button>
      </div>
    </section>
  );
}

function NextStepCarousel() {
  const { tasks, goals, saveTiming, ready } = useTasks();
  const [order, setOrder] = useState<string[]>([]);
  const warned = useRef(new Set<string>());
  const [notice, setNotice] = useState("");
  useEffect(() => { if (ready) setOrder((previous) => previous.length ? [...previous.filter((id) => tasks.some((t) => t.id === id)), ...orderedTaskIds(tasks).filter((id) => !previous.includes(id))] : orderedTaskIds(tasks)); }, [ready, tasks]);
  const cards = order.map((id) => tasks.find((t) => t.id === id)).filter((t) => !!t);
  const scroller = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);

  function goTo(index: number) {
    const next = Math.max(0, Math.min(index, cards.length - 1));
    scroller.current?.children[next]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setPosition(next);
    announceUrgent(next);
  }

  function announceUrgent(index: number) {
    const urgent = cards.find((task) => task.id !== cards[index]?.id && currentStep(task) && task.timing?.kind === "fixed" && ["overdue", "today"].includes(deadlineState(task.timing)));
    if (urgent && !warned.current.has(urgent.id)) { warned.current.add(urgent.id); setNotice(`${urgent.title}: ${timingLabel(urgent)}.`); }
  }
  return (
    <section className="mt-8" aria-labelledby="next-steps-heading">
      <div className="flex items-end justify-between gap-4">
        <div><h2 id="next-steps-heading" className="text-lg font-medium">Your next steps</h2></div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => goTo(position - 1)} disabled={position === 0} aria-label="Previous next step" className="h-11 w-11 rounded-full"><ArrowLeft aria-hidden /></Button>
          <Button variant="outline" size="icon" onClick={() => goTo(position + 1)} disabled={position >= cards.length - 1} aria-label="Next next step" className="h-11 w-11 rounded-full"><ArrowRight aria-hidden /></Button>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Not feeling this task? You can try another.</p>
      {notice && <p role="status" className="mt-3 border-l-2 border-accent pl-3 text-sm">{notice}</p>}
      {tasks.length === 0 && <div className="mt-4 border-y border-border py-8"><p className="text-muted-foreground">A fresh start. What would you like to work on?</p><Button asChild className="mt-4 h-11 rounded-xl"><Link to="/assistant">New conversation <ArrowRight aria-hidden /></Link></Button></div>}
      <div ref={scroller} tabIndex={tasks.length ? 0 : undefined} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); goTo(position + (event.key === "ArrowRight" ? 1 : -1)); } }} onScroll={(event) => { const element = event.currentTarget; const width = element.firstElementChild?.clientWidth || 1; const next = Math.round(element.scrollLeft / (width + 16)); setPosition(next); announceUrgent(next); }} className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]" aria-label="Next step for each project">
        {cards.map((task) => (
          <article key={task.id} className="flex w-[85%] shrink-0 snap-start flex-col rounded-2xl bg-secondary p-6 text-secondary-foreground sm:w-[60%] lg:w-[48%]">
            <p className="text-sm font-medium">{task.title}</p>
            {!currentStep(task) && <Smile className="mt-4 h-6 w-6 text-primary" aria-hidden />}
            <p className="mt-2 text-xs text-muted-foreground">{timingLabel(task)}</p>
            {task.goalId && <p className="mt-2 text-sm">Goal: {goals.find((g) => g.id === task.goalId)?.title}{task.contribution && <span className="block mt-1 text-xs text-muted-foreground">{task.contribution}</span>}</p>}
            <h3 className="mt-3 font-display text-2xl leading-snug">{currentStep(task) ? currentStepTitle(task) : "You did it!"}</h3>
            <div className="mt-auto pt-6">
              <div className="flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card/60" role="progressbar" aria-label={`${task.title} progress`} aria-valuenow={task.steps.length ? Math.round((task.completedStepIds.length / task.steps.length) * 100) : 0} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary" style={{ width: `${task.steps.length ? (task.completedStepIds.length / task.steps.length) * 100 : 0}%` }} /></div><span className="shrink-0 text-xs font-medium">{task.completedStepIds.length}/{task.steps.length} steps</span></div>
              {currentStep(task) && <div className="mt-5"><TaskActions task={task} /></div>}
              <TimingEditor value={task.timing} onSave={(timing) => saveTiming(task.id, timing)} label="Edit timing" />
              <Button asChild variant="ghost" className="mt-2 h-11 rounded-xl bg-card"><Link to="/tasks/$taskId" params={{ taskId: task.id }} search={{ chat: true }}>{currentStep(task) ? "Open conversation" : "View completed project"} <ArrowRight aria-hidden /></Link></Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TaskList() {
  const { tasks } = useTasks();
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <section className={`${card} md:col-span-3`} aria-labelledby="tasks-heading">
      <div className="flex items-center justify-between"><h2 id="tasks-heading" className="text-lg font-medium">Today's tasks</h2><span className="text-xs text-muted-foreground">Your pace, your order</span></div>
      <ul className="mt-4 space-y-2">
        {tasks.map((task) => {
          const complete = !currentStep(task);
          const isExpanded = expanded === task.id;
          const progress = Math.round((task.completedStepIds.length / task.steps.length) * 100);
          return (
            <li key={task.id} className="rounded-xl border border-transparent bg-background/50 transition-colors hover:border-border">
              <div className="flex items-start gap-2 p-3">
                <button onClick={() => setExpanded(isExpanded ? null : task.id)} aria-expanded={isExpanded} aria-label={`${isExpanded ? "Hide" : "Show"} details for ${task.title}`} className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-muted"><ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`} aria-hidden /></button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2"><p className={`font-medium ${complete ? "text-muted-foreground" : ""}`}>{task.title}</p>{complete && <Smile className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-label="Completed" />}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{task.course} · {timingLabel(task)} · {complete ? "Complete" : `${task.completedStepIds.length} of ${task.steps.length} steps completed`}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${task.title} progress`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
                <Link to="/tasks/$taskId" params={{ taskId: task.id }} aria-label={`Open ${task.title}`} className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight className="h-4 w-4" aria-hidden /></Link>
              </div>
              {isExpanded && <div className="mx-4 mb-4 ml-11 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground"><p className="text-xs font-medium uppercase tracking-wide opacity-75">{complete ? "Finished" : "Current step"}</p><p className="mt-1.5">{currentStepTitle(task)}</p><Link to="/tasks/$taskId" params={{ taskId: task.id }} className="mt-3 inline-flex items-center gap-1 font-medium underline underline-offset-4">Open workspace <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Dashboard() {
  const { tasks } = useTasks();
  const completed = tasks.filter((task) => !currentStep(task)).length;
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const max = Math.max(...weekFocus, 1);
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <header><p className="text-sm text-muted-foreground">Saturday, November 7</p><h1 className="mt-1 text-3xl font-medium md:text-4xl">Good afternoon, Mayra.</h1><p className="mt-2 text-muted-foreground">{completed} of {tasks.length} tasks complete. Progress at your own pace, one step at a time.</p></header>
      <NextStepCarousel />
      <GoalOverview />
      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <TaskList />
        <div className="md:col-span-2"><FocusTimer /></div>
        <section className={`${card} md:col-span-3`} aria-labelledby="schedule-heading"><h2 id="schedule-heading" className="text-lg font-medium">Schedule</h2><ol className="mt-4 space-y-4">{schedule.map((event) => <li key={event.time} className="flex gap-4"><span className="flex w-14 items-center gap-1 text-sm font-medium text-primary"><Clock className="h-3.5 w-3.5" aria-hidden />{event.time}</span><span><span className="block">{event.title}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden />{event.place}</span></span></li>)}</ol></section>
        <section className={`${card} md:col-span-2`} aria-labelledby="week-heading"><h2 id="week-heading" className="text-lg font-medium">Focus this week</h2><p className="text-sm text-muted-foreground">{weekFocus.reduce((a, b) => a + b, 0)} focus blocks</p><div className="mt-6 flex h-28 items-end justify-between gap-2">{weekFocus.map((value, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-md bg-chart-4" style={{ height: `${(value / max) * 100}%`, minHeight: 4 }} aria-label={`${value} blocks`} /><span className="text-xs text-muted-foreground">{days[index]}</span></div>)}</div></section>
      </div>
    </div>
  );
}
