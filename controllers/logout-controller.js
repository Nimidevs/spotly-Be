import asyncHandler from "express-async-handler";
import { hashRefreshToken } from "../lib/token";
import prisma from "../lib/prisma";


const logOut = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (refreshToken) {
    try {
      const hashedRefreshToken = hashRefreshToken(refreshToken);
      await prisma.session.deleteMany({
        where: { refreshTokenHash: hashedRefreshToken },
      });
    } catch (err) {
        console.log(err)
    }
  }

  res.clearCookie("refresh_token");

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export default logOut

