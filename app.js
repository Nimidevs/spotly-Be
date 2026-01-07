import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import errorHandler from "./controllers/global-error-controller.js";
import routes from "./routes/index.js";
import AppError from "./utils/app-error.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const port = process.env.PORT || 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  })
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

app.listen(port, () => {
  console.log(`listening at port: ${port}`);
});
