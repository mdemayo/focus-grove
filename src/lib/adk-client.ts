
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
  message: string
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
        parts: [{ text: message }],
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

  return replies.at(-1) ?? "No pude generar una respuesta. Inténtalo de nuevo.";
}


export type AdkTaskPlan = {
  goal: string;
  steps: string[];
  current_step: number;
  completed_steps: number[];
  status: string;
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
