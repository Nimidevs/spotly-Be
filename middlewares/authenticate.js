import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import AppError from "../utils/app-error.js";
import dotenv from "dotenv";

dotenv.config();

// const authenticate = asyncHandler(async (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   // 1. Header presence & format
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     throw new AppError("Missing or invalid Authorization header", 401);
//   }

//   const token = authHeader.split(" ")[1];

//   if (!token) {
//     throw new AppError("Unauthorized", 401);
//   }

//   // 2. Verify token (this can throw)
//   let decoded;
//   try {
//     decoded = jwt.verify(token, process.env.JWT_SECRET);
//   } catch (err) {
//     if (err.name === "TokenExpiredError") {
//       throw new AppError("Access token expired", 401);
//     }
//     throw new AppError("Invalid token", 401);
//   }

//   // 3. Attach user context
//   req.user = {
//     id: decoded.sub,
//   };

//   next();
// });

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(
      "Missing or invalid Authorization header",
      401,
      "AUTH_401_MISSING_HEADER"
    );
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new AppError("Unauthorized", 401, "AUTH_401_NO_TOKEN");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Access token expired", 401, "AUTH_401_EXPIRED");
    }
    throw new AppError("Invalid token", 401, "AUTH_401_INVALID");
  }

  // Attach user context
  req.user = { id: decoded.sub };

  next();
});

export const verifyTokenForWs = (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Access token expired", 401, "AUTH_401_EXPIRED");
    }
    throw new Error("Invalid token", 401, "AUTH_401_INVALID");
  }
  return decoded.sub;
};

export default authenticate;
