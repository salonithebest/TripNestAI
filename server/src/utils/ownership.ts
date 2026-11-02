import { isValidObjectId } from "mongoose";
import { Trip } from "../models/Trip";
import { AppError } from "./AppError";

export function assertValidId(id: string, label = "id"): void {
  if (!isValidObjectId(id)) {
    throw new AppError(400, `Invalid ${label}`);
  }
}

export async function assertTripOwner(tripId: string, userId: string) {
  assertValidId(tripId, "trip id");
  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) {
    throw new AppError(404, "Trip not found");
  }
  return trip;
}
