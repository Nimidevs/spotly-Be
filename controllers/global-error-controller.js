import AppError from "../utils/app-error.js";

const handlePrismaError = (err) => {
  if (err.code === "P2002") {
    return new AppError(
      "This value already exists",
      409,
      "RESOURCE_409_CONFLICT"
    );
  }

  // Record not found
  if (err.code === "P2025") {
    return new AppError("Resource not found", 404, "RESOURCE_404_NOT_FOUND");
  }

  // Foreign key failure
  if (err.code === "P2003") {
    return new AppError(
      "Invalid reference provided",
      400,
      "RESOURCE_400_INVALID_REFERENCE"
    );
  }

  return err;
};

export default (err, req, res, next) => {
  if (err.name === "PrismaClientKnownRequestError") {
    err = handlePrismaError(err);
  }

  const statusCode = err.statusCode || 500;
  const status = err.status || "error";
  const code = err.code || "INTERNAL_500_UNEXPECTED";

  const response = {
    success: false,
    status,
    code,
    message: err.isOperational ? err.message : "Something went wrong",
  };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
    response.err = err;
  }
  res.status(statusCode).json(response);
};
