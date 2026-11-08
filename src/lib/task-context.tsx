
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  assistantReply,
  currentStep,
  initialTasks,
  type ChatMessage,
  type Task,
} from "@/lib/mock-data";

import { sendToAdk, getAdkTaskPlan, type AdkTaskPlan } from "@/lib/adk-client";
import { validTiming, type Goal, type Timing, type Milestone } from "@/lib/task-details";

// Acciones disponibles para administrar las tareas.
export type TaskAction =
  | { type: "restore"; tasks: Task[] }
  | { type: "patch-task"; taskId: string; patch: Partial<Task> }
  | { type: "add-task"; task: Task }
  | { type: "complete-step"; taskId: string }
  | { type: "try-another-way"; taskId: string }
  | { type: "send-message"; taskId: string; text: string }
  | { type: "append-message"; taskId: string; message: ChatMessage }
  | {
      type: "sync-progress";
      taskId: string;
      completedStepIds: string[];
    };

// Actualiza el estado de las tareas.
export function taskReducer(
  tasks: Task[],
  action: TaskAction
): Task[] {
  if (action.type === "restore") {
    return action.tasks;
  }

  if (action.type === "add-task") {
    // Evitar crear una tarea duplicada.
    if (tasks.some((task) => task.id === action.task.id)) {
      return tasks;
    }

    return [...tasks, action.task];
  }

  return tasks.map((task) => {
    if (task.id !== action.taskId) {
      return task;
    }

    if (action.type === "patch-task") return { ...task, ...action.patch };

    // Sincronizar progreso con Google ADK.
    if (action.type === "sync-progress") {
      return {
        ...task,
        completedStepIds: action.completedStepIds,
        activeAlternative: action.completedStepIds.includes(task.activeAlternative?.stepId ?? "") ? undefined : task.activeAlternative,
      };
    }

    // Guardar un mensaje real del usuario o del agente.
    if (action.type === "append-message") {
      // Evitar duplicar mensajes con el mismo ID.
      if (
        task.messages.some(
          (message) => message.id === action.message.id
        )
      ) {
        return task;
      }

      return {
        ...task,
        messages: [...task.messages, action.message],
      };
    }

    const step = currentStep(task);

    // Compatibilidad con el flujo anterior.
    if (action.type === "complete-step") {
      if (!step || task.completedStepIds.includes(step.id)) {
        return task;
      }

      const completedStepIds = [
        ...task.completedStepIds,
        step.id,
      ];

      return {
        ...task,
        completedStepIds,
        alternativeStepId: undefined,
        messages: [
          ...task.messages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text:
              completedStepIds.length === task.steps.length
                ? "You finished the last step. Take a moment to notice what you accomplished."
                : "Step complete. Nice work—your next small step is ready whenever you are.",
          },
        ],
      };
    }

    // Compatibilidad con alternativas locales.
    if (action.type === "try-another-way") {
      if (!step?.alternative) {
        return task;
      }

      return {
        ...task,
        alternativeStepId:
          task.alternativeStepId === step.id
            ? undefined
            : step.id,
      };
    }

    // Compatibilidad con mensajes simulados antiguos.
    // El chat integrado con ADK utiliza appendMessage.
    if (action.type === "send-message") {
      const text = action.text.trim();

      if (!text) {
        return task;
      }

      return {
        ...task,
        messages: [
          ...task.messages,
          {
            id: crypto.randomUUID(),
            role: "user",
            text,
          },
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: assistantReply(text, task),
          },
        ],
      };
    }

    return task;
  });
}

export type ActionIntent = "complete" | "alternative" | "accept-action" | "chat" | "propose-milestone" | "accept-milestone";
type TaskContextValue = {
  tasks: Task[]; goals: Goal[]; ready: boolean;
  pending: Record<string, boolean>; errors: Record<string, string>;
  addTask: (task: Task) => void;
  appendMessage: (taskId: string, message: ChatMessage) => void;
  syncProgress: (taskId: string, completedStepIds: string[]) => void;
  completeStep: (taskId: string) => void;
  tryAnotherWay: (taskId: string) => void;
  sendMessage: (taskId: string, text: string) => void;
  patchTask: (taskId: string, patch: Partial<Task>) => void;
  runAction: (taskId: string, intent: ActionIntent, text?: string) => Promise<boolean>;
  saveTiming: (taskId: string, timing: Timing) => void;
  createGoal: (title: string) => string;
  linkGoal: (taskId: string, goalId?: string, contribution?: string) => void;
  updateProposal: (goalId: string, patch: Partial<Milestone>) => void;
  acceptMilestone: (goalId: string) => Promise<boolean>;
};
const TaskContext = createContext<TaskContextValue | null>(null);
const STORAGE_KEY = "steady-task-workspaces-v1";

export function planPatch(task: Task, plan: AdkTaskPlan, allowProgress: boolean): Partial<Task> {
  const patch: Partial<Task> = {};
  // Never silently replace the approved plan or import unconfirmed completion from ordinary chat.
  if (allowProgress) patch.completedStepIds = plan.completed_steps.map((i) => task.steps[i]?.id).filter((id): id is string => !!id);
  if (plan.alternative && task.steps[plan.alternative.step_index] && ["starter", "equivalent"].includes(plan.alternative.kind)) {
    patch.activeAlternative = { id: plan.alternative.id, stepId: task.steps[plan.alternative.step_index]?.id ?? "", text: plan.alternative.text, kind: plan.alternative.kind, acknowledged: plan.alternative.acknowledged };
  } else if (plan.alternative === null) patch.activeAlternative = undefined;
  if (allowProgress && patch.completedStepIds?.includes(patch.activeAlternative?.stepId ?? task.activeAlternative?.stepId ?? "")) patch.activeAlternative = undefined;
  if (validTiming(plan.timing)) patch.timing = plan.timing;
  if (plan.action_state) patch.actionState = plan.action_state;
  if (allowProgress && patch.completedStepIds?.length === task.steps.length) patch.outcome = task.steps.map((step) => step.title).join("; ");
  return patch;
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, dispatch] = useReducer(taskReducer, initialTasks);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const locks = useRef(new Set<string>());
  const storageReadable = useRef(true);
  const latest = useRef({ tasks, goals });
  latest.current = { tasks, goals };
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
      const rows = Array.isArray(saved) ? saved : saved?.tasks;
      if (Array.isArray(rows)) dispatch({ type: "restore", tasks: rows.filter((t) => t && typeof t.id === "string" && Array.isArray(t.steps) && Array.isArray(t.messages) && Array.isArray(t.completedStepIds)) });
      if (Array.isArray(saved?.goals)) setGoals(saved.goals);
    } catch { storageReadable.current = false; setErrors((e) => ({ ...e, storage: "Saved browser data could not be read and has been left untouched." })); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !storageReadable.current) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, tasks, goals })); }
    catch { setErrors((e) => ({ ...e, storage: "Changes could not be saved in this browser." })); }
  }, [tasks, goals, ready]);
  const patchTask = (taskId: string, patch: Partial<Task>) => dispatch({ type: "patch-task", taskId, patch });
  const appendMessage = (taskId: string, message: ChatMessage) => dispatch({ type: "append-message", taskId, message });
  function goalContext(task: Task) {
    const goal = latest.current.goals.find((g) => g.id === task.goalId);
    return { project: { title: task.title, objective: task.objective, timing: task.timing ?? null, legacy_timing: task.due, completed_actions: task.steps.filter((s) => task.completedStepIds.includes(s.id)).map((s) => s.title) }, goal: goal ? { id: goal.id, title: goal.title } : null, prior_outcomes: goal ? latest.current.tasks.filter((t) => t.goalId === goal.id && t.id !== task.id && t.outcome).map((t) => ({ project: t.title, outcome: t.outcome })) : [], current_milestone: task.title };
  }
  async function runAction(taskId: string, intent: ActionIntent, text?: string): Promise<boolean> {
    const task = latest.current.tasks.find((t) => t.id === taskId);
    if (!task || locks.current.has(taskId)) return false;
    const step = currentStep(task);
    const index = task.steps.findIndex((s) => s.id === step?.id);
    const operationId = crypto.randomUUID();
    locks.current.add(taskId); setPending((p) => ({ ...p, [taskId]: true })); setErrors((e) => ({ ...e, [taskId]: "" }));
    const prompts: Record<ActionIntent, string> = {
      complete: task.activeAlternative?.kind === "starter" && !task.activeAlternative.acknowledged ? "I finished the smaller starting action, not the whole step. Acknowledge it and keep the underlying step active." : "I confirm I finished the current step. Mark only this step completed.",
      alternative: "Offer ONE smaller or equivalent alternative for this step using structured alternative state. Do not change progress, goal or timing.",
      "accept-action": "Start here. I accept this action; I have not completed it.",
      chat: text ?? "", "propose-milestone": "Propose ONE useful next milestone for the linked goal, using recorded outcomes. Save a structured proposal; do not create a plan.",
      "accept-milestone": text ?? "Create the explicitly approved milestone plan."
    };
    try {
      const reply = await sendToAdk(taskId, prompts[intent], { intent, operation_id: operationId, expected_step: index, alternative_id: task.activeAlternative?.id, completion_scope: task.activeAlternative?.kind === "starter" && !task.activeAlternative.acknowledged ? "starter" : "step", confirmed: intent === "complete", ...goalContext(task) });
      const plan = await getAdkTaskPlan(taskId);
      if (!plan) throw new Error("The assistant did not return saved action state. Retry when ADK is available.");
      if (plan.steps.length !== task.steps.length || plan.steps.some((title, i) => title !== task.steps[i]?.title)) throw new Error("The saved ADK plan differs from your approved steps. Nothing was changed.");
      if (intent === "complete") {
        const starter = task.activeAlternative?.kind === "starter" && !task.activeAlternative.acknowledged;
        if (starter ? !plan.alternative?.acknowledged || plan.completed_steps.includes(index) : !plan.completed_steps.includes(index)) throw new Error("The assistant has not confirmed this action. Progress is unchanged.");
      }
      if (intent === "alternative" && (!plan.alternative || plan.alternative.step_index !== index)) throw new Error("No saved alternative was confirmed. Your original step is unchanged.");
      if (intent === "chat" && text) appendMessage(taskId, { id: `${operationId}-user`, role: "user", text });
      appendMessage(taskId, { id: `${operationId}-reply`, role: "assistant", text: reply });
      patchTask(taskId, planPatch(task, plan, intent === "complete"));
      if (task.goalId && plan.milestone_proposal) {
        const proposal = plan.milestone_proposal;
        setGoals((all) => all.map((g) => g.id === task.goalId && (!g.proposal?.acceptedTaskId || g.proposal.id !== proposal.id) ? { ...g, proposal: g.proposal?.id === proposal.id ? { ...proposal, deferred: g.proposal.deferred ?? false } : proposal } : g));
      }
      return true;
    } catch (error) {
      setErrors((e) => ({ ...e, [taskId]: error instanceof Error ? error.message : "Could not reach ADK. Nothing was changed; please retry." }));
      return false;
    } finally { locks.current.delete(taskId); setPending((p) => ({ ...p, [taskId]: false })); }
  }
  async function acceptMilestone(goalId: string) {
    const goal = latest.current.goals.find((g) => g.id === goalId);
    const proposal = goal?.proposal;
    if (!goal || !proposal || proposal.acceptedTaskId || locks.current.has(goalId)) return false;
    const taskId = `milestone_${proposal.id}`;
    if (latest.current.tasks.some((t) => t.id === taskId)) return false;
    // Reserve one stable ID before network work; retries reuse the same ADK session.
    locks.current.add(goalId); setPending((p) => ({ ...p, [goalId]: true }));
    try {
      const reply = await sendToAdk(taskId, `I approve this milestone: ${proposal.title}. Create its 2–5 small steps. Ask about timing without assuming a deadline.`, { intent: "accept-milestone", operation_id: taskId, goal: { id: goal.id, title: goal.title }, proposal, timing: { kind: "none" } });
      const plan = await getAdkTaskPlan(taskId);
      if (!plan || plan.steps.length < 2 || plan.steps.length > 5) throw new Error("ADK did not confirm a milestone plan. Please retry.");
      dispatch({ type: "add-task", task: { id: taskId, title: plan.goal, objective: plan.goal, course: "General", due: "No deadline", timing: { kind: "none" }, goalId, contribution: proposal.reason, minutes: 15, steps: plan.steps.map((title, i) => ({ id: `step-${i}`, title })), completedStepIds: [], actionState: "accepted", messages: [{ id: `${taskId}-reply`, role: "assistant", text: reply }] } });
      setGoals((all) => all.map((g) => g.id === goalId && g.proposal ? { ...g, proposal: { ...g.proposal, acceptedTaskId: taskId } } : g));
      return true;
    } catch (error) { setErrors((e) => ({ ...e, [goalId]: error instanceof Error ? error.message : "Could not create milestone. Please retry." })); return false; }
    finally { locks.current.delete(goalId); setPending((p) => ({ ...p, [goalId]: false })); }
  }
  const value: TaskContextValue = {
    tasks, goals, ready, pending, errors, patchTask, appendMessage, runAction, acceptMilestone,
    addTask: (task) => dispatch({ type: "add-task", task }),
    syncProgress: (taskId, completedStepIds) => dispatch({ type: "sync-progress", taskId, completedStepIds }),
    completeStep: (taskId) => { void runAction(taskId, "complete"); },
    tryAnotherWay: (taskId) => { void runAction(taskId, "alternative"); },
    sendMessage: (taskId, text) => { void runAction(taskId, "chat", text); },
    saveTiming: (taskId, timing) => { if (validTiming(timing)) patchTask(taskId, { timing }); },
    createGoal: (title) => { const id = crypto.randomUUID(); if (title.trim()) setGoals((g) => [...g, { id, title: title.trim() }]); return id; },
    linkGoal: (taskId, goalId, contribution) => patchTask(taskId, { goalId, contribution }),
    updateProposal: (goalId, patch) => setGoals((all) => all.map((g) => g.id === goalId && g.proposal ? { ...g, proposal: { ...g.proposal, ...patch } } : g)),
  };
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
export function useTasks() { const context = useContext(TaskContext); if (!context) throw new Error("useTasks must be used within TaskProvider"); return context; }
