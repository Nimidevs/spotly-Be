import asyncHandler from "express-async-handler";
import prisma from "../lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../lib/token";
import AppError from "../utils/app-error";
import dotenv from "dotenv";

dotenv.config();


const refreshToken = asyncHandler(async (req, res) => {
  const REFRESH_TOKEN_EXPIRY_DAYS = 30;
  const REFRESH_TOKEN_EXPIRY_MS =
    REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const incomingRefreshToken = req.cookies.refresh_token;
  if (!incomingRefreshToken) {
    throw new AppError(
      "Missing refresh token",
      401,
      "AUTH_401_REFRESH_MISSING"
    );
  }
  
  console.log('refreshtokeninCookie:', incomingRefreshToken)

  const hashedRefreshToken = hashRefreshToken(incomingRefreshToken);
  console.log('hashedRefreshTokenfromrefresh:', hashedRefreshToken)

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashedRefreshToken },
    include: { user: true },
  });

  if (!session) {
    res.clearCookie("refresh_token");
    throw new AppError(
      "Invalid refresh token",
      401,
      "AUTH_401_REFRESH_INVALID"
    );
  }

  if (Date.now() > session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: session.id } });
    res.clearCookie("refresh_token");
    throw new AppError(
      "Refresh token expired",
      401,
      "AUTH_401_REFRESH_EXPIRED"
    );
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash =  hashRefreshToken(newRefreshToken);
  const newAccessToken = generateAccessToken(session.user);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.session.updateMany({
      where: {
        id: session.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    if (updated.count !== 1) {
      throw new AppError(
        "Refresh token reuse detected",
        401,
        "AUTH_401_REFRESH_REUSE"
      );
    }

    await tx.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        usedAt: null,
      },
    });
  });

  res.cookie("refresh_token", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });

  res.status(200).json({
    success: true,
    token: newAccessToken,
    message: "Token refreshed successfully",
  });
});


export default refreshToken;
