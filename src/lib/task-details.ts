import type { Task } from "@/lib/mock-data";

export type Timing = { kind: "none" } | { kind: "fixed" | "personal"; date: string; time?: string };
export type Alternative = { id: string; stepId: string; text: string; kind: "equivalent" | "starter"; acknowledged?: boolean | undefined };
export type Milestone = { id: string; title: string; steps: string[]; reason: string; contribution: string; deferred?: boolean; acceptedTaskId?: string };
export type Goal = { id: string; title: string; proposal?: Milestone };

export function validTiming(value: unknown): value is Timing {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  if (t['kind'] === "none") return true;
  if (t['kind'] !== "fixed" && t['kind'] !== "personal") return false;
  if (typeof t['date'] !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t['date'])) return false;
  const [year, month, day] = t['date'].split("-").map(Number);
  const local = new Date(year ?? 0, (month ?? 0) - 1, day ?? 0);
  if (local.getFullYear() !== year || local.getMonth() + 1 !== month || local.getDate() !== day) return false;
  return t['time'] === undefined || (typeof t['time'] === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t['time']));
}

export function localDate(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function deadlineState(timing: Timing | undefined, now = new Date()): "none" | "overdue" | "today" | "upcoming" | "target-passed" {
  if (!timing || timing.kind === "none") return "none";
  const today = localDate(now);
  const passed = timing.date < today || (timing.date === today && !!timing.time && timing.time < `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  if (passed) return timing.kind === "fixed" ? "overdue" : "target-passed";
  return timing.date === today ? "today" : "upcoming";
}

export function timingLabel(task: Pick<Task, "timing" | "due">, now = new Date()): string {
  const t = task.timing;
  if (!t) return task.due || "No deadline";
  if (t['kind'] === "none") return "No deadline";
  const date = new Date(`${t['date']}T12:00:00`);
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const state = deadlineState(t, now);
  const prefix = state === "overdue" ? "Overdue" : state === "target-passed" ? "Target passed" : t['kind'] === "personal" ? "Personal target" : state === "today" ? "Due today" : "Due";
  return `${prefix} · ${label}${t['time'] ? `, ${t['time']}` : " · No specific time"}`;
}

export function orderedTaskIds(tasks: Task[], now = new Date()): string[] {
  function rank(task: Task) {
    if (task.steps.length > 0 && task.completedStepIds.length >= task.steps.length) return 4;
    if (task.timing?.kind === "fixed") return deadlineState(task.timing, now) === "overdue" ? 0 : 1;
    if (task.timing?.kind === "personal") return 2;
    return 3;
  }
  return [...tasks].sort((a, b) => rank(a) - rank(b) || ((a.timing && a.timing.kind !== "none" ? `${a.timing.date}T${a.timing.time ?? "23:59"}` : "") .localeCompare(b.timing && b.timing.kind !== "none" ? `${b.timing.date}T${b.timing.time ?? "23:59"}` : ""))).map((task) => task.id);
}

export function displayedAction(task: Task) {
  const step = task.steps.find((item) => !task.completedStepIds.includes(item.id));
  const alternative = task.activeAlternative;
  return alternative && alternative.stepId === step?.id && !alternative.acknowledged ? alternative.text : step?.title;
}