
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";

import {
  assistantReply,
  currentStep,
  initialTasks,
  type ChatMessage,
  type Task,
} from "@/lib/mock-data";

// Acciones disponibles para administrar las tareas.
export type TaskAction =
  | { type: "restore"; tasks: Task[] }
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

    // Sincronizar progreso con Google ADK.
    if (action.type === "sync-progress") {
      return {
        ...task,
        completedStepIds: action.completedStepIds,
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

type TaskContextValue = {
  tasks: Task[];
  addTask: (task: Task) => void;
  appendMessage: (
    taskId: string,
    message: ChatMessage
  ) => void;
  completeStep: (taskId: string) => void;
  tryAnotherWay: (taskId: string) => void;
  sendMessage: (taskId: string, text: string) => void;
  syncProgress: (
    taskId: string,
    completedStepIds: string[]
  ) => void;
};

const TaskContext =
  createContext<TaskContextValue | null>(null);

const STORAGE_KEY = "steady-task-workspaces-v1";

// Recuperar las tareas guardadas antes del primer renderizado.
function loadSavedTasks(defaultTasks: Task[]): Task[] {
  if (typeof window === "undefined") {
    return defaultTasks;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return defaultTasks;
    }

    const parsed: unknown = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed as Task[];
    }
  } catch (error) {
    console.error("Error restoring Steady tasks:", error);
  }

  return defaultTasks;
}

export function TaskProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Carga las tareas guardadas durante la inicialización.
  const [tasks, dispatch] = useReducer(
    taskReducer,
    initialTasks,
    loadSavedTasks
  );

  // Guardar los cambios después de actualizar el estado.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tasks)
      );
    } catch (error) {
      console.error("Error saving Steady tasks:", error);
    }
  }, [tasks]);

  const value: TaskContextValue = {
    tasks,

    addTask: (task) => {
      dispatch({
        type: "add-task",
        task,
      });
    },

    appendMessage: (taskId, message) => {
      dispatch({
        type: "append-message",
        taskId,
        message,
      });
    },

    syncProgress: (taskId, completedStepIds) => {
      dispatch({
        type: "sync-progress",
        taskId,
        completedStepIds,
      });
    },

    completeStep: (taskId) => {
      dispatch({
        type: "complete-step",
        taskId,
      });
    },

    tryAnotherWay: (taskId) => {
      dispatch({
        type: "try-another-way",
        taskId,
      });
    },

    sendMessage: (taskId, text) => {
      dispatch({
        type: "send-message",
        taskId,
        text,
      });
    },
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);

  if (!context) {
    throw new Error(
      "useTasks must be used within TaskProvider"
    );
  }

  return context;
}
