import AppError from "./app-error.js";

const validate = (schema, payload) => {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true, /* returns undefined req.body (request body) as an empty object */
  });

  if (error) {
    const message = error.details.map((d) => d.message).join(", ");

    throw new AppError(message, 400);
  }

  return value;
};

export default validate;
