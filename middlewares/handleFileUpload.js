import asyncHandler from "express-async-handler";
import AppError from "../utils/app-error";
import { imageUploadFunctionModifiedToUseBuffers } from "../cloudinary";

export const handleImageUpload = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    throw new AppError("Image file is required", 400);
  }

  if (!req.file.mimetype.startsWith("image/")) {
    throw new AppError("Only image files are allowed", 400);
  }

  let uploadResult;

  try {
    uploadResult = await imageUploadFunctionModifiedToUseBuffers(
      req.file.buffer
    );
  } catch (err) {
    // Upstream failure (Cloudinary / network)
    throw new AppError("Image upload failed", 502);
  }

  if (!uploadResult?.secure_url) {
    throw new AppError("Invalid image upload response", 502);
  }

  // Enrich request for downstream handlers
  req.body.imageUrl = uploadResult.secure_url;

  next();
});

