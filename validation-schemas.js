import Joi from "joi";

const authSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .trim()
    .pattern(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
    .min(8)
    .max(20)
    .required(),
});

const reasonSchema = Joi.object({
  reason: Joi.string()
    .valid("CASUAL_MEETUP", "FRIENDSHIP", "ACTIVITY_PARTNER", "NETWORKING")
    .required(),
});

const profileSchema = Joi.object({
  firstname: Joi.string().trim().min(1).max(50),

  lastname: Joi.string().trim().min(1).max(50),

  dateOfBirth: Joi.date().iso().less("now"),

  gender: Joi.string().valid("MALE", "FEMALE"),

  bio: Joi.string().trim().max(500),
});

const locationSchema = Joi.object({
  permission: Joi.string().valid("GRANTED", "DENIED").required().messages({
    "any.required": "Location permission is required",
    "string.base": "Location permission must be a string",
    "any.only": "Location permission must be either GRANTED or DENIED",
    "string.empty": "Location permission cannot be empty",
  }),
});

export { authSchema, reasonSchema, profileSchema, locationSchema };
