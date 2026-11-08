import { describe, expect, it } from "vitest";
import { type Task } from "@/lib/mock-data";
import { taskReducer } from "@/lib/task-context";

// Test fixtures only: the application must continue to start without example tasks.
const initialTasks: Task[] = [
  { id: "psychology-reading", title: "Reading", course: "Test", due: "No date", minutes: 15, objective: "Reading", steps: [{ id: "psy-1", title: "Open text" }, { id: "psy-2", title: "Read" }, { id: "psy-3", title: "Summarize", alternative: "Record a summary" }], completedStepIds: ["psy-1", "psy-2"], messages: [] },
  { id: "biology-lab", title: "Lab", course: "Test", due: "No date", minutes: 15, objective: "Lab", steps: [{ id: "bio-1", title: "Open notes" }], completedStepIds: [], messages: [] },
];

describe("task progress", () => {
  it("advances only the current step when Done is chosen", () => {
    const result = taskReducer(initialTasks, { type: "complete-step", taskId: "psychology-reading" });
    expect(result[0]?.completedStepIds).toEqual(["psy-1", "psy-2", "psy-3"]);
    expect(result[1]?.completedStepIds).toEqual([]);
  });

  it("does not advance progress when Try another way is chosen", () => {
    const result = taskReducer(initialTasks, { type: "try-another-way", taskId: "psychology-reading" });
    expect(result[0]?.completedStepIds).toEqual(["psy-1", "psy-2"]);
    expect(result[0]?.alternativeStepId).toBe("psy-3");
  });

  it("keeps help conversations independent and does not complete a step", () => {
    const result = taskReducer(initialTasks, { type: "send-message", taskId: "biology-lab", text: "I need help" });
    expect(result[1]?.completedStepIds).toEqual([]);
    expect(result[1]?.messages).toHaveLength(2);
    expect(result[0]?.messages).toEqual([]);
  });
});
