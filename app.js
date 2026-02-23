import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import errorHandler from "./controllers/global-error-controller.js";
import routes from "./routes/index.js";
import AppError from "./utils/app-error.js";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { onMessage } from "./ws/onMessage.js";
import { createDemoData } from "./utils/createMockData.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const port = process.env.PORT || 8000;

const server = app.listen(port, async () => {
  await createDemoData().catch((err) => {
    console.error("createDemoData failed:", err);
  });
  console.log(`listening at port: ${port}`);
});

const activeConections =
  new Map(); /** We'd later upgrade this to use Redis so it'd be scalable */
activeConections.get();
const wss = new WebSocketServer({ server });
wss.on("connection", async (ws, req) => {
  console.log("New WebSocket connection");
  console.log("Request URL:", req.url); // ← See what path is being requested
  console.log("Request headers:", req.headers);

  ws.on("message", (raw) => onMessage(ws, raw, activeConections));
  //ws.on("close", () => onDisconnect())
  // app.js
  ws.on("close", () => {
    if (ws.userId) {
      activeConections.delete(ws.userId);
      console.log(`User ${ws.userId} disconnected`);
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    if (ws.userId) {
      activeConections.delete(ws.userId);
    }
  });
});

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
//app.use(express.static(path.join(__dirname, "public")));

app.use("/api", routes);

app.use((req, res, next) => {
  const err = new AppError(`${req.originalUrl} does not exist`, 404);
  next(err);
});

app.use(errorHandler);
