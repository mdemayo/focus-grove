import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Clock, MapPin, Pause, Play, RotateCcw, MessageCircle } from "lucide-react";
import { initialTasks, schedule, weekFocus } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Steady" },
      { name: "description", content: "Your calm daily overview: one focus, a short task list and a gentle timer." },
      { property: "og:title", content: "Today — Steady" },
      { property: "og:description", content: "A calm daily overview for students with ADHD." },
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
    const t = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [running]);
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  const pct = ((total - left) / total) * 100;
  return (
    <section className={card} aria-labelledby="timer-h">
      <h2 id="timer-h" className="text-lg font-medium">Focus timer</h2>
      <p className="mt-6 text-center font-display text-6xl font-medium tabular-nums" aria-live="polite">{m}:{s}</p>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Focus progress">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={() => setRunning((r) => !r)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
          {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={() => { setRunning(false); setLeft(total); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">
          <RotateCcw className="h-4 w-4" aria-hidden /> Reset
        </button>
      </div>
    </section>
  );
}

function Dashboard() {
  const [tasks, setTasks] = useState(initialTasks);
  const done = tasks.filter((t) => t.done).length;
  const next = tasks.find((t) => !t.done);
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const max = Math.max(...weekFocus, 1);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <header>
        <p className="text-sm text-muted-foreground">Saturday, November 7</p>
        <h1 className="mt-1 text-3xl font-medium md:text-4xl">Good afternoon, Mayra.</h1>
        <p className="mt-2 text-muted-foreground">{done} of {tasks.length} done today. One step at a time.</p>
      </header>

      {next && (
        <section className="mt-8 rounded-2xl bg-secondary p-6 text-secondary-foreground" aria-labelledby="next-h">
          <h2 id="next-h" className="text-sm font-medium uppercase tracking-wide opacity-80">Your one next step</h2>
          <p className="mt-2 font-display text-2xl">{next.title}</p>
          <p className="mt-1 text-sm opacity-80">{next.course} · about {next.minutes} min</p>
          <Link to="/assistant" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <MessageCircle className="h-4 w-4" aria-hidden /> Help me start
          </Link>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <section className={`${card} md:col-span-3`} aria-labelledby="tasks-h">
          <h2 id="tasks-h" className="text-lg font-medium">Today's tasks</h2>
          <ul className="mt-4 space-y-2">
            {tasks.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                  aria-pressed={t.done}
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-muted"
                >
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${t.done ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {t.done && <Check className="h-3 w-3" aria-hidden />}
                  </span>
                  <span className="flex-1">
                    <span className={`block ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t.course} · {t.due} · {t.minutes} min</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <div className="md:col-span-2"><FocusTimer /></div>

        <section className={`${card} md:col-span-3`} aria-labelledby="sched-h">
          <h2 id="sched-h" className="text-lg font-medium">Schedule</h2>
          <ol className="mt-4 space-y-4">
            {schedule.map((e) => (
              <li key={e.time} className="flex gap-4">
                <span className="flex w-14 items-center gap-1 text-sm font-medium text-primary"><Clock className="h-3.5 w-3.5" aria-hidden />{e.time}</span>
                <span>
                  <span className="block">{e.title}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden />{e.place}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${card} md:col-span-2`} aria-labelledby="week-h">
          <h2 id="week-h" className="text-lg font-medium">Focus this week</h2>
          <p className="text-sm text-muted-foreground">{weekFocus.reduce((a, b) => a + b, 0)} focus blocks</p>
          <div className="mt-6 flex h-28 items-end justify-between gap-2">
            {weekFocus.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-md bg-chart-4" style={{ height: `${(v / max) * 100}%`, minHeight: 4 }} aria-label={`${v} blocks`} />
                <span className="text-xs text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
