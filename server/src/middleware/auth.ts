import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized. Please log in." });
  }

  try {
    const payload = jwt.verify(header.slice("Bearer ".length), env.JWT_SECRET);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return res.status(401).json({ message: "Your session has expired. Please log in again." });
    }
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}
