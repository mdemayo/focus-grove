import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from "react";
import { assistantReply, currentStep, initialTasks, type ChatMessage, type Task } from "@/lib/mock-data";

export type TaskAction =
  | { type: "complete-step"; taskId: string }
  | { type: "try-another-way"; taskId: string }
  | { type: "send-message"; taskId: string; text: string };

export function taskReducer(tasks: Task[], action: TaskAction): Task[] {
  return tasks.map((task) => {
    if (task.id !== action.taskId) return task;
    const step = currentStep(task);
    if (action.type === "complete-step") {
      if (!step || task.completedStepIds.includes(step.id)) return task;
      return {
        ...task,
        completedStepIds: [...task.completedStepIds, step.id],
        alternativeStepId: undefined,
        messages: [
          ...task.messages,
          { id: crypto.randomUUID(), role: "assistant", text: task.completedStepIds.length + 1 === task.steps.length ? "You finished the last step. Take a moment to notice what you accomplished." : "Step complete. Nice work—your next small step is ready whenever you are." },
        ],
      };
    }
    if (action.type === "try-another-way") {
      if (!step?.alternative) return task;
      return { ...task, alternativeStepId: task.alternativeStepId === step.id ? undefined : step.id };
    }
    const text = action.text.trim();
    if (!text) return task;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    return {
      ...task,
      messages: [...task.messages, userMessage, { id: crypto.randomUUID(), role: "assistant", text: assistantReply(text, task) }],
    };
  });
}

type TaskContextValue = {
  tasks: Task[];
  completeStep: (taskId: string) => void;
  tryAnotherWay: (taskId: string) => void;
  sendMessage: (taskId: string, text: string) => void;
};

const TaskContext = createContext<TaskContextValue | null>(null);
const STORAGE_KEY = "steady-task-workspaces-v1";

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, dispatch] = useReducer(taskReducer, initialTasks);
  const restored = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Task[];
        if (Array.isArray(parsed) && parsed.length) {
          for (const task of parsed) dispatch({ type: "send-message", taskId: task.id, text: "" });
        }
      }
    } catch { /* Keep mock data if saved state is unavailable. */ }
    restored.current = true;
  }, []);

  useEffect(() => {
    if (restored.current) {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch { /* Local-only prototype can continue without storage. */ }
    }
  }, [tasks]);

  return (
    <TaskContext.Provider value={{
      tasks,
      completeStep: (taskId) => dispatch({ type: "complete-step", taskId }),
      tryAnotherWay: (taskId) => dispatch({ type: "try-another-way", taskId }),
      sendMessage: (taskId, text) => dispatch({ type: "send-message", taskId, text }),
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTasks must be used within TaskProvider");
  return context;
}
