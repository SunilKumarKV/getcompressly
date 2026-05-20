import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404, "NOT_FOUND"));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message, code: error.code });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({ message: "Database request failed", code: error.code });
  }

  if (error instanceof Error && error.name === "MulterError") {
    return res.status(400).json({ message: error.message, code: "UPLOAD_ERROR" });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error", code: "INTERNAL_ERROR" });
};
