import { describe, expect, it } from "vitest";
import { deadlineState, timingLabel, orderedTaskIds, validTiming } from "@/lib/task-details";
import { planPatch, taskReducer } from "@/lib/task-context";
import type { Task } from "@/lib/mock-data";
import type { AdkTaskPlan } from "@/lib/adk-client";

const task: Task = { id: "t", title: "Report", course: "General", due: "Friday after class", minutes: 15, objective: "Report", steps: [{ id: "original-a", title: "Write introduction" }, { id: "original-b", title: "Review" }], completedStepIds: [], messages: [{ id: "m", role: "user", text: "My report" }] };
const plan: AdkTaskPlan = { goal: "Report", steps: ["Write introduction", "Review"], current_step: 0, completed_steps: [], status: "in_progress" };
const now = new Date(2026, 10, 8, 12, 0);
describe("local project timing", () => {
  it("treats a date-only fixed deadline today as due today, not overdue", () => expect(deadlineState({ kind: "fixed", date: "2026-11-08" }, now)).toBe("today"));
  it("marks a timed fixed deadline overdue only after its local time", () => { expect(deadlineState({ kind: "fixed", date: "2026-11-08", time: "11:59" }, now)).toBe("overdue"); expect(deadlineState({ kind: "fixed", date: "2026-11-08", time: "12:00" }, now)).toBe("today"); });
  it("labels personal targets neutrally after they pass", () => expect(timingLabel({ due: "", timing: { kind: "personal", date: "2026-11-07" } }, now)).toContain("Target passed"));
  it("distinguishes no deadline, date-only and time", () => { expect(timingLabel({ due: "", timing: { kind: "none" } }, now)).toBe("No deadline"); expect(timingLabel({ due: "", timing: { kind: "fixed", date: "2026-11-09" } }, now)).toContain("No specific time"); expect(timingLabel({ due: "", timing: { kind: "fixed", date: "2026-11-09", time: "15:30" } }, now)).toContain("15:30"); });
  it("preserves unstructured legacy timing instead of inventing a date", () => expect(timingLabel(task, now)).toBe("Friday after class"));
  it("rejects impossible calendar dates and ambiguous deadline types", () => { expect(validTiming({ kind: "fixed", date: "2026-02-30" })).toBe(false); expect(validTiming({ kind: "", date: "2026-11-08" })).toBe(false); });
  it("orders overdue fixed, upcoming fixed, personal, no deadline then completed without mutation", () => {
    const rows: Task[] = [{ ...task, id: "none" }, { ...task, id: "personal", timing: { kind: "personal", date: "2026-11-07" } }, { ...task, id: "future", timing: { kind: "fixed", date: "2026-11-10" } }, { ...task, id: "urgent", timing: { kind: "fixed", date: "2026-11-07" } }, { ...task, id: "done", completedStepIds: ["original-a", "original-b"] }];
    expect(orderedTaskIds(rows, now)).toEqual(["urgent", "future", "personal", "none", "done"]); expect(rows[0]?.id).toBe("none");
  });
});
describe("structured action state", () => {
  it("ordinary chat and acceptance cannot import completion", () => { expect(planPatch(task, { ...plan, completed_steps: [0], action_state: "accepted" }, false).completedStepIds).toBeUndefined(); });
  it("alternative remains attached to its original step without changing the plan, goal or timing", () => {
    const patch = planPatch(task, { ...plan, completed_steps: [0], alternative: { id: "a", step_index: 0, text: "Write one word", kind: "starter" } }, false);
    expect(patch.activeAlternative?.stepId).toBe("original-a"); expect(patch.completedStepIds).toBeUndefined(); expect(patch.steps).toBeUndefined(); expect(patch.goalId).toBeUndefined(); expect(patch.timing).toBeUndefined();
  });
  it("acknowledging a smaller start keeps the underlying step open", () => {
    const patch = planPatch(task, { ...plan, alternative: { id: "a", step_index: 0, text: "Write one word", kind: "starter", acknowledged: true } }, true);
    expect(patch.completedStepIds).toEqual([]); expect(patch.activeAlternative?.acknowledged).toBe(true);
  });
  it("confirmed completion uses original IDs and clears the completed alternative", () => {
    const t = { ...task, activeAlternative: { id: "a", stepId: "original-a", text: "Dictate", kind: "equivalent" as const } };
    const patch = planPatch(t, { ...plan, completed_steps: [0], alternative: null }, true);
    expect(patch.completedStepIds).toEqual(["original-a"]); expect(patch.activeAlternative).toBeUndefined();
  });
  it("updates shared state while preserving original messages and approved steps", () => {
    const result = taskReducer([task], { type: "patch-task", taskId: "t", patch: { timing: { kind: "none" }, goalId: "goal" } });
    expect(result[0]?.messages).toEqual(task.messages); expect(result[0]?.steps).toEqual(task.steps); expect(result[0]?.goalId).toBe("goal");
  });
  it("duplicate project and reply IDs cannot create duplicates", () => {
    expect(taskReducer([task], { type: "add-task", task })).toHaveLength(1);
    expect(taskReducer([task], { type: "append-message", taskId: "t", message: { id: "m", role: "user", text: "My report" } })[0]?.messages).toHaveLength(1);
  });
});