import { authHandler } from "./authHandler";
import { availabilityHandler } from "./availabilityHandler";
import { locationHandler } from "./locationHandler";
import { chatIntent } from "./chatIntentHandler";
import { chatAccept } from "./chatAcceptHandler";

export const handlers = {
  auth: authHandler,
  "location:update": locationHandler,
  "availability:update": availabilityHandler,
  "chat:intent": chatIntent,
  "chat:accept": chatAccept,
};
