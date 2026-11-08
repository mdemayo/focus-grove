import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskProvider, useTasks } from "@/lib/task-context";
import type { Task } from "@/lib/mock-data";
import type { AdkTaskPlan } from "@/lib/adk-client";

const adk = vi.hoisted(() => ({ send: vi.fn(), plan: vi.fn() }));
vi.mock("@/lib/adk-client", () => ({ sendToAdk: adk.send, getAdkTaskPlan: adk.plan }));
const task: Task = { id: "existing", title: "Paper", objective: "Paper", course: "General", due: "Friday", minutes: 15, steps: [{ id: "step-0", title: "Open paper" }, { id: "step-1", title: "Write notes" }], completedStepIds: [], messages: [{ id: "original", role: "user", text: "Existing message" }], goalId: "goal" };
const plan: AdkTaskPlan = { goal: "Paper", steps: ["Open paper", "Write notes"], completed_steps: [], current_step: 0, status: "in_progress" };
let state: ReturnType<typeof useTasks> | undefined;
function Probe() { state = useTasks(); return <p>{state.tasks.length}</p>; }
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); state = undefined; adk.send.mockResolvedValue("Actual test response"); adk.plan.mockResolvedValue(plan); });
afterEach(cleanup);
async function mount(envelope: unknown = [task]) { localStorage.setItem("steady-task-workspaces-v1", JSON.stringify(envelope)); render(<TaskProvider><Probe /></TaskProvider>); await waitFor(() => expect(state?.ready).toBe(true)); }
describe("shared actions with simulated ADK contract", () => {
  it("saves later messages into the existing project's conversation", async () => {
    await mount(); await act(async () => { await state?.runAction("existing", "chat", "A later question"); });
    expect(state?.tasks[0]?.messages.map((m) => m.text)).toEqual(["Existing message", "A later question", "Actual test response"]);
    expect(state?.tasks[0]?.completedStepIds).toEqual([]);
  });
  it("failure preserves the saved action and progress without inventing a reply", async () => {
    adk.send.mockRejectedValue(new Error("ADK unavailable")); await mount(); await act(async () => { await state?.runAction("existing", "complete"); });
    expect(state?.tasks[0]?.messages).toEqual(task.messages); expect(state?.tasks[0]?.completedStepIds).toEqual([]); expect(state?.errors['existing']).toBe("ADK unavailable");
  });
  it("locks duplicate completion requests across surfaces", async () => {
    adk.plan.mockResolvedValue({ ...plan, completed_steps: [0], current_step: 1 }); await mount();
    await act(async () => { await Promise.all([state?.runAction("existing", "complete"), state?.runAction("existing", "complete")]); });
    expect(adk.send).toHaveBeenCalledTimes(1); expect(state?.tasks[0]?.completedStepIds).toEqual(["step-0"]);
  });
  it("persists a smaller alternative across remount without advancing progress", async () => {
    adk.plan.mockResolvedValue({ ...plan, alternative: { id: "alt", step_index: 0, text: "Open folder", kind: "starter" } }); await mount();
    await act(async () => { await state?.runAction("existing", "alternative"); }); cleanup(); render(<TaskProvider><Probe /></TaskProvider>);
    await waitFor(() => expect(state?.tasks[0]?.activeAlternative?.text).toBe("Open folder")); expect(state?.tasks[0]?.completedStepIds).toEqual([]);
  });
  it("Not now retains its proposal and creates no project", async () => {
    const proposal = { id: "p", title: "Next", steps: ["Open", "Read"], reason: "Build understanding", contribution: "Read paper" };
    await mount({ tasks: [task], goals: [{ id: "goal", title: "Research", proposal }] });
    act(() => state?.updateProposal("goal", { deferred: true })); expect(state?.goals[0]?.proposal?.deferred).toBe(true); expect(state?.tasks).toHaveLength(1); expect(adk.send).not.toHaveBeenCalled();
  });
  it("accepting a milestone twice creates exactly one independent project/session with no inherited deadline", async () => {
    const proposal = { id: "p", title: "Next", steps: ["Open", "Read"], reason: "Build understanding", contribution: "Read paper" };
    await mount({ tasks: [task], goals: [{ id: "goal", title: "Research", proposal }] });
    await act(async () => { await Promise.all([state?.acceptMilestone("goal"), state?.acceptMilestone("goal")]); });
    await act(async () => { await state?.acceptMilestone("goal"); });
    expect(adk.send).toHaveBeenCalledTimes(1); expect(adk.send.mock.calls[0]?.[0]).toBe("milestone_p"); expect(state?.tasks).toHaveLength(2); expect(state?.tasks[1]?.timing).toEqual({ kind: "none" }); expect(state?.tasks[0]).toEqual(task);
  });
  it("finishing a project records its approved actions but keeps the parent goal", async () => {
    adk.plan.mockResolvedValue({ ...plan, completed_steps: [0, 1], current_step: 2, status: "completed" });
    await mount({ tasks: [{ ...task, completedStepIds: ["step-0"] }], goals: [{ id: "goal", title: "Research" }] });
    await act(async () => { await state?.runAction("existing", "complete"); });
    expect(state?.tasks[0]?.outcome).toBe("Open paper; Write notes"); expect(state?.goals[0]?.title).toBe("Research");
  });
});