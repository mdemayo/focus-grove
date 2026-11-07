import { describe, expect, it } from "vitest";
import { initialTasks } from "@/lib/mock-data";
import { taskReducer } from "@/lib/task-context";

describe("task progress", () => {
  it("advances only the current step when Done is chosen", () => {
    const result = taskReducer(initialTasks, { type: "complete-step", taskId: "psychology-reading" });
    expect(result[0]!.completedStepIds).toEqual(["psy-1", "psy-2", "psy-3"]);
    expect(result[1]!.completedStepIds).toEqual(initialTasks[1]!.completedStepIds);
  });

  it("does not advance progress when Try another way is chosen", () => {
    const result = taskReducer(initialTasks, { type: "try-another-way", taskId: "psychology-reading" });
    expect(result[0]!.completedStepIds).toEqual(initialTasks[0]!.completedStepIds);
    expect(result[0]!.alternativeStepId).toBe("psy-3");
  });

  it("keeps help conversations independent and does not complete a step", () => {
    const result = taskReducer(initialTasks, { type: "send-message", taskId: "biology-lab", text: "I need help" });
    expect(result[1]!.completedStepIds).toEqual(initialTasks[1]!.completedStepIds);
    expect(result[1]!.messages).toHaveLength(2);
    expect(result[0]!.messages).toEqual(initialTasks[0]!.messages);
  });
});
