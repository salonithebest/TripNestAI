import { AppError } from "./AppError";

export function routeParam(value: string | string[] | undefined, label: string): string {
  if (typeof value !== "string") {
    throw new AppError(400, `Invalid ${label}`);
  }
  return value;
}
