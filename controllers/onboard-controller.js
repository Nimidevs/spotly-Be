import asyncHandler from "express-async-handler";
import AppError from "../utils/app-error";
import prisma from "../lib/prisma";
import validate from "../utils/validate";
import {
  locationSchema,
  profileSchema,
  reasonSchema,
} from "../validation-schemas";

export const joinReason = asyncHandler(async (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new AppError("Request body is required", 400);
  }

  const data = validate(reasonSchema, req.body);

  await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      joinReason: data.reason,
      onboardingStep: 1,
      onboardingStatus: "IN_PROGRESS",
    },
  });

  res.status(200).json({
    success: true,
    message: "Reason updated successfully",
  });
});

export const profile = asyncHandler(async (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new AppError("Request body is required", 400);
  }
  const data = validate(profileSchema, req.body);

  await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      onboardingStep: 2,
      firstName: data.firstname,
      lastName: data.lastname,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bio: data.bio,
    },
  });

  res.status(200).json({
    success: true,
    message: "Proile updated successfully",
  });
});

export const avatar = asyncHandler(async (req, res, next) => {
  if (!req.body?.imageUrl) {
    throw new AppError("Avatar image is required", 400);
  }

  await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      onboardingStep: 3,
      avatarUrl: req.body.imageUrl,
    },
  });

  res.status(200).json({
    success: true,
    message: "Avatar uploaded Successfully",
  });
});

export const location = asyncHandler(async (req, res, next) => {
  if (!req.body) {
    throw new AppError("Location Permission not sent", 400);
  }
  console.log(req.body)
  const data = validate(locationSchema, req.body);
  console.log(data)

  const user = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      onboardingStep: 4,
      onboardingStatus: 'COMPLETED',
      location_permission: data.permission,
    },
  });

  const { passwordHash, isBanned, deletedAt, updatedAt, ...safeUser } = user;


  res.status(200).json({
    success: true,
    message: "Location permission updated",
    user: safeUser
  });
});
