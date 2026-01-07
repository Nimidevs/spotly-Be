import asyncHandler from "express-async-handler";
import prisma from "../lib/prisma.js";
import { authSchema } from "../validation-schemas.js";
import AppError from "../utils/app-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../lib/token.js";
import bcrypt from "bcryptjs";
import validate from "../utils/validate.js";

const signUp = asyncHandler(async (req, res, next) => {
  const REFRESH_TOKEN_EXPIRY_DAYS = 30;
  const REFRESH_TOKEN_EXPIRY_MS =
    REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  if (!req.body || Object.keys(req.body).length === 0) {
    console.log(req);
    throw new AppError(
      "Request body is required",
      400,
      "VALIDATION_400_EMPTY_BODY"
    );
  }

  const data = validate(authSchema, req.body);

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const refreshToken = generateRefreshToken();
  console.log('refreshTokenfromLogin:', refreshToken)
  const hashedRefreshToken = hashRefreshToken(refreshToken);
  console.log('hashedRefreshTokenfromLogin:', hashedRefreshToken)
  const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  /* So we're using transactions to avoid edge cases like the user getting created, but the 
  session creation failing.. with this logic they either both go through or both fail*/
  let newUser;
  await prisma.$transaction(async (tx) => {
    newUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
      },
    });

    await tx.session.create({
      data: {
        userId: newUser.id,
        refreshTokenHash: hashedRefreshToken,
        expiresAt: refreshTokenExpiry,
      },
    });
  });

  const accessToken = generateAccessToken(newUser);

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    token: accessToken,
    user: newUser,
  });
});

export default signUp;
