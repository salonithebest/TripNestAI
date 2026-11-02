import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";

const SALT_ROUNDS = 12;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

function toPublicUser(user: { _id: unknown; name: string; email: string }) {
  return { id: String(user._id), name: user.name, email: user.email };
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw new AppError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({ token: signToken(String(user._id)), user: toPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }

  res.json({ token: signToken(String(user._id)), user: toPublicUser(user) });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  res.json({ user: toPublicUser(user) });
}
