import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

function generateAccessToken(user) {
  const PAYLOAD = {
    sub: user.id,
    //Jwt automatically adds the iat(issued at) property itself if you omit it
  };
  const token = jwt.sign(PAYLOAD, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
  return token;
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

function hashRefreshToken(token) {
  // return await bcrypt.hash(token, 10);
  return crypto
    .createHmac('sha256', process.env.REFRESH_TOKEN_SECRET)
    .update(token)
    .digest('hex');
}

export {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
