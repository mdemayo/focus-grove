
import type { Timing } from "@/lib/task-details";
const ADK_URL = "http://127.0.0.1:8002";
const APP_NAME = "my_agent";
const USER_ID = "student_001"; // Usuario temporal para las pruebas locales

type AdkEvent = {
  author?: string;
  content?: {
    role?: string;
    parts?: Array<{ text?: string }>;
  };
};

export async function sendToAdk(
  sessionId: string,
  message: string,
  context?: Record<string, unknown>
): Promise<string> {
  const sessionUrl =
    `${ADK_URL}/apps/${APP_NAME}/users/${USER_ID}/sessions/${encodeURIComponent(sessionId)}`;

  // Comprobar si ya existe una sesión para esta tarea.
  const existingSession = await fetch(sessionUrl);

  if (existingSession.status === 404) {
    const created = await fetch(sessionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!created.ok && created.status !== 409) {
      throw new Error("No se pudo crear la sesión de ADK.");
    }
  } else if (!existingSession.ok) {
    throw new Error("No se pudo consultar la sesión de ADK.");
  }

  // Enviar el mensaje al agente.
  const response = await fetch(`${ADK_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appName: APP_NAME,
      userId: USER_ID,
      sessionId,
      newMessage: {
        role: "user",
        parts: [{ text: context ? JSON.stringify({ steady_request: context, message }) : message }],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Error de ADK: ${response.status}`);
  }

  const events: AdkEvent[] = await response.json();

  // Obtener la última respuesta de texto del agente.
  const replies = events
    .filter(
      (event) =>
        event.author === "root_agent" &&
        event.content?.role === "model"
    )
    .map((event) =>
      (event.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim()
    )
    .filter(Boolean);

  const reply = replies.at(-1);
  if (!reply) throw new Error("ADK returned no reply. Please retry.");
  return reply;
}


export type AdkTaskPlan = {
  goal: string;
  steps: string[];
  current_step: number;
  completed_steps: number[];
  status: string;
  alternative?: { id: string; step_index: number; text: string; kind: "equivalent" | "starter"; acknowledged?: boolean } | null;
  timing?: Timing;
  action_state?: "proposed" | "accepted";
  action_receipt?: string;
  milestone_proposal?: { id: string; title: string; steps: string[]; reason: string; contribution: string };
  outcome?: string;
};

export async function getAdkTaskPlan(
  sessionId: string
): Promise<AdkTaskPlan | null> {
  const url =
    `${ADK_URL}/apps/${APP_NAME}/users/${USER_ID}/sessions/${encodeURIComponent(sessionId)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo leer el progreso: ${response.status}`);
  }

  const session = await response.json();
  return session.state?.task_plan ?? null;
}
