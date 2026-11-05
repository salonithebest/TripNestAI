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
    const duplicateError = err as {
      keyPattern?: Record<string, unknown>;
      index?: unknown;
    };
    const duplicateKeys =
      typeof duplicateError.keyPattern === "object" && duplicateError.keyPattern !== null
        ? Object.keys(duplicateError.keyPattern).join(" ")
        : "";
    const indexName = typeof duplicateError.index === "string" ? duplicateError.index : "";

    if (duplicateKeys.includes("email") || indexName.includes("email")) {
      res.status(409).json({ message: "An account with this email already exists. Log in instead." });
      return;
    }

    if (duplicateKeys.includes("sequence") || indexName.includes("sequence")) {
      res.status(409).json({
        message: "This journey leg sequence number already exists within this trip.",
      });
      return;
    }

    if (
      indexName === "unique_train_trip_pnr_departure" ||
      (duplicateKeys.includes("tripId") &&
        duplicateKeys.includes("pnr") &&
        duplicateKeys.includes("departure"))
    ) {
      res.status(409).json({ message: "This train leg is already added." });
      return;
    }

    res.status(409).json({ message: "A record with these details already exists." });
    return;
  }
  if (typeof err === "object" && err !== null && "name" in err && err.name === "CastError") {
    res.status(400).json({ message: "Invalid identifier in request" });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong on the server" });
};
