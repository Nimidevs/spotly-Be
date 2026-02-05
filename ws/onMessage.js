import { handlers } from "../ws-handlers/handlers";

export const onMessage = (ws, raw, connectionsMap) => {
  let message;

  try {
    message = JSON.parse(raw);
  } catch (error) {
    ws.close(1003, "Invalid JSON");
    return;
  }

  const { event, payload } = message;

  if (event !== "auth" && !ws.userId) {
    ws.close(4002, "unauthenticated");
    return;
  }

  const handler = handlers[event];
  if (!handler) {
    ws.send(JSON.stringify({ error: "Unknown event" }));
    return;
  }
  handler(ws, payload, connectionsMap);
};
