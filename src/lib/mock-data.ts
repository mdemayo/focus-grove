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

export const initialTasks: Task[] = [];

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
