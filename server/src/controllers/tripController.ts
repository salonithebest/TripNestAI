import type { Request, Response } from "express";
import { JourneySegment } from "../models/JourneySegment";
import { Trip } from "../models/Trip";
import { AppError } from "../utils/AppError";
import { assertTripOwner } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, "Not authorized. Please log in.");
  }
  return req.userId;
}

export async function createTrip(req: Request, res: Response) {
  const trip = await Trip.create({ ...req.body, userId: getUserId(req) });
  res.status(201).json({ trip });
}

export async function listTrips(req: Request, res: Response) {
  const trips = await Trip.find({ userId: getUserId(req) }).sort({ startDate: 1 });
  res.json({ trips });
}

export async function getTrip(req: Request, res: Response) {
  const trip = await assertTripOwner(routeParam(req.params.tripId, "trip id"), getUserId(req));
  res.json({ trip });
}

export async function updateTrip(req: Request, res: Response) {
  const trip = await assertTripOwner(routeParam(req.params.tripId, "trip id"), getUserId(req));
  Object.assign(trip, req.body);
  if (trip.endDate < trip.startDate) {
    throw new AppError(400, "End date must be on or after the start date");
  }
  await trip.save();
  res.json({ trip });
}

export async function deleteTrip(req: Request, res: Response) {
  const trip = await assertTripOwner(routeParam(req.params.tripId, "trip id"), getUserId(req));
  await JourneySegment.deleteMany({ tripId: trip._id });
  await trip.deleteOne();
  res.json({ message: "Trip deleted" });
}
