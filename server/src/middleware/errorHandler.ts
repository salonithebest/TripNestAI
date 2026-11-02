import type { ErrorRequestHandler, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
    res.status(409).json({
      message: "This value already exists. For journey legs, the sequence number must be unique within a trip.",
    });
    return;
  }
  if (typeof err === "object" && err !== null && "name" in err && err.name === "CastError") {
    res.status(400).json({ message: "Invalid identifier in request" });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong on the server" });
};
