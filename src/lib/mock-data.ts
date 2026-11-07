export type Task = { id: string; title: string; course: string; due: string; minutes: number; done: boolean };

export const initialTasks: Task[] = [
  { id: "1", title: "Read chapter 4 — Cognitive Psychology", course: "PSY 201", due: "Today, 3 PM", minutes: 25, done: false },
  { id: "2", title: "Outline lab report intro", course: "BIO 110", due: "Today, 6 PM", minutes: 20, done: false },
  { id: "3", title: "Reply to study group message", course: "General", due: "Today", minutes: 5, done: true },
  { id: "4", title: "Practice set: derivatives 1–10", course: "MATH 150", due: "Tomorrow", minutes: 30, done: false },
];

export const schedule = [
  { time: "10:00", title: "Statistics lecture", place: "Hall B" },
  { time: "13:30", title: "Focus block: lab report", place: "Library, 2nd floor" },
  { time: "16:00", title: "Office hours — Dr. Ruiz", place: "Room 214" },
];

export const weekFocus = [3, 5, 2, 4, 6, 1, 0]; // focus blocks per day

export type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

export const starterPrompts = [
  "Break my lab report into small steps",
  "I feel stuck — help me start",
  "Plan my afternoon",
  "Remind me what's due this week",
];

// Mock replies until the Google ADK backend is connected.
export function mockReply(input: string): string {
  const q = input.toLowerCase();
  if (q.includes("stuck") || q.includes("start"))
    return "That's okay — starting is the hardest part. Let's pick one tiny step: open your document and write just the title. That's it. Want me to start a 5‑minute timer?";
  if (q.includes("break") || q.includes("step"))
    return "Here's a gentle breakdown:\n\n1. Write 3 bullet points for the intro (10 min)\n2. Find one source to cite (10 min)\n3. Turn bullets into sentences (15 min)\n4. Short break 🌿\n\nShall I add these to your tasks?";
  if (q.includes("plan") || q.includes("afternoon"))
    return "You have office hours at 4 PM. I'd suggest: 1:30–2:00 lab report, 2:00–2:10 break, 2:10–2:40 reading. One thing at a time.";
  if (q.includes("due"))
    return "This week: Chapter 4 reading (today), lab report intro (today), derivatives practice set (tomorrow). Nothing else — you've got this.";
  return "Got it. Would it help to turn that into one small, concrete next step?";
}
