export type TaskStep = { id: string; title: string; alternative?: string };
export type ChatMessage = { id: string; role: "user" | "assistant"; text: string };
export type Task = {
  id: string;
  title: string;
  course: string;
  due: string;
  minutes: number;
  objective: string;
  steps: TaskStep[];
  completedStepIds: string[];
  alternativeStepId?: string | undefined;
  messages: ChatMessage[];
};

export const initialTasks: Task[] = [
  {
    id: "psychology-reading",
    title: "Read chapter 4 — Cognitive Psychology",
    course: "PSY 201",
    due: "Today, 3 PM",
    minutes: 25,
    objective: "Understand how attention and memory work, and capture the ideas you need for Friday's seminar.",
    steps: [
      { id: "psy-1", title: "Read the chapter summary and learning goals", alternative: "Listen to the chapter summary using text-to-speech" },
      { id: "psy-2", title: "Skim the headings and write down three questions", alternative: "Turn three headings into simple questions" },
      { id: "psy-3", title: "Read the attention section and highlight two key ideas", alternative: "Read one page and explain its main idea out loud" },
      { id: "psy-4", title: "Write a three-sentence summary from memory", alternative: "Record a short voice note summarizing the section" },
      { id: "psy-5", title: "Choose one idea to mention in the seminar" },
    ],
    completedStepIds: ["psy-1", "psy-2"],
    messages: [
      { id: "psy-m1", role: "assistant", text: "You already know the chapter's shape. Let's focus on the attention section next—just two key ideas." },
    ],
  },
  {
    id: "biology-lab",
    title: "Outline lab report intro",
    course: "BIO 110",
    due: "Today, 6 PM",
    minutes: 20,
    objective: "Create a clear introduction that explains the research question, background and hypothesis.",
    steps: [
      { id: "bio-1", title: "Write the research question in one sentence", alternative: "Finish this sentence: ‘We wanted to find out…’" },
      { id: "bio-2", title: "Add two bullet points of background information", alternative: "Explain the background to a friend in two short sentences" },
      { id: "bio-3", title: "Write your hypothesis as an if–then statement", alternative: "Start with: ‘If we change ___, then ___ will…’" },
      { id: "bio-4", title: "Turn your bullets into a short paragraph" },
      { id: "bio-5", title: "Read the introduction aloud and fix one unclear sentence" },
    ],
    completedStepIds: ["bio-1"],
    messages: [],
  },
  {
    id: "study-group",
    title: "Reply to study group message",
    course: "General",
    due: "Today",
    minutes: 5,
    objective: "Confirm the study group time and share what you can prepare.",
    steps: [{ id: "group-1", title: "Send a short reply confirming Sunday at 2 PM" }],
    completedStepIds: ["group-1"],
    messages: [{ id: "group-m1", role: "assistant", text: "All done. You kept it simple and moved on—nice work." }],
  },
  {
    id: "derivatives-practice",
    title: "Practice set: derivatives 1–10",
    course: "MATH 150",
    due: "Tomorrow",
    minutes: 30,
    objective: "Practice basic derivative rules and identify which problems need another look.",
    steps: [
      { id: "math-1", title: "Set up your page and copy the power rule", alternative: "Open your notes to the power rule and keep them beside you" },
      { id: "math-2", title: "Solve problems 1 and 2 without checking the answers", alternative: "Talk through problem 1 aloud before writing anything" },
      { id: "math-3", title: "Check your work and circle anything uncertain" },
      { id: "math-4", title: "Solve problems 3–5 in one focused block" },
      { id: "math-5", title: "Take a short break, then try problems 6–8" },
      { id: "math-6", title: "Finish problems 9 and 10 and note one question" },
    ],
    completedStepIds: [],
    messages: [],
  },
];

export const schedule = [
  { time: "10:00", title: "Statistics lecture", place: "Hall B" },
  { time: "13:30", title: "Focus block: lab report", place: "Library, 2nd floor" },
  { time: "16:00", title: "Office hours — Dr. Ruiz", place: "Room 214" },
];

export const weekFocus = [3, 5, 2, 4, 6, 1, 0];

export const starterPrompts = [
  "Break my lab report into small steps",
  "I feel stuck — help me start",
  "Plan my afternoon",
  "Remind me what's due this week",
];

export function currentStep(task: Task) {
  return task.steps.find((step) => !task.completedStepIds.includes(step.id));
}

export function currentStepTitle(task: Task) {
  const step = currentStep(task);
  if (!step) return "All steps complete";
  return task.alternativeStepId === step.id && step.alternative ? step.alternative : step.title;
}

export function assistantReply(input: string, task?: Task): string {
  const q = input.toLowerCase();
  if (q.includes("stuck") || q.includes("start") || q.includes("help"))
    return task
      ? `Let's make this smaller. For **${currentStepTitle(task)}**, give yourself permission to try for just two minutes. A rough attempt counts.`
      : "Starting is the hardest part. Choose the easiest task and try just **two minutes**. A rough start still counts.";
  if (q.includes("break") || q.includes("step"))
    return "Keep it gentle: **one small action**, then a pause. You don't need to see the whole finish line to make progress.";
  if (q.includes("plan") || q.includes("afternoon"))
    return "Try **25 minutes on one task**, take a real break, then switch projects if you want. There is no need to finish one before starting another.";
  if (q.includes("due"))
    return "Today: **chapter 4 reading** and your **lab report intro**. Derivatives can wait until tomorrow. Pick whichever feels most approachable.";
  return task
    ? `Your only focus is **${currentStepTitle(task)}**. What feels unclear or difficult about it?`
    : "Let's turn that into **one small, concrete next step**. Which task would you like to work on?";
}
