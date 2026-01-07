import asyncHandler from "express-async-handler";
import prisma from "../lib/prisma.js";
import { authSchema } from "../validation-schemas.js";
import AppError from "../utils/app-error.js";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../lib/token.js";
import validate from "../utils/validate.js";
import dotenv from "dotenv";

dotenv.config();

const logIn = asyncHandler(async (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    // throw new AppError("Request body is required", 400);
    throw new AppError({
      message: "Request body is required",
      status: 400,
      code: "VALIDATION_400_EMPTY_BODY",
    });
  }

  const data = validate(authSchema, req.body);

  const REFRESH_TOKEN_EXPIRY_DAYS = 30;
  const REFRESH_TOKEN_EXPIRY_MS =
    REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const FAKE_HASH =
    "$2b$10$fakehashtopreventtimingattacks12345678901234567890123";

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: data.email },
    });
  } catch (err) {
    throw new AppError({
      message: "Unable to process login request",
      status: 500,
      code: "SERVER_500_USER_LOOKUP_FAILED",
    });
  }

  const passwordMatches = user
    ? await bcrypt.compare(data.password, user.passwordHash)
    : await bcrypt.compare(data.password, FAKE_HASH);

  if (!user || !passwordMatches) {
    // throw new AppError("Email or Password incorrect", 401);
    throw new AppError({
      message: "Invalid email or password",
      status: 401,
      code: "AUTH_401_INVALID_CREDENTIALS",
    });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();

  const hashedRefreshToken = hashRefreshToken(refreshToken);
  const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  try {
    await prisma.session.create({
      data: {
        refreshTokenHash: hashedRefreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });
  } catch (error) {
    // throw new AppError("Failed to create session", 500);
    throw new AppError({
      message: "Login failed",
      status: 500,
      code: "SERVER_500_SESSION_CREATE_FAILED",
    });
  }

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });

  res.status(200).json({
    success: true,
    user,
    message: "Login Successful",
    token: accessToken,
  });
});

export default logIn;
