import type { Request, Response } from "express";
import { JourneySegment } from "../models/JourneySegment";
import { AppError } from "../utils/AppError";
import { assertTripOwner, assertValidId } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";
import { validateDeparture } from "../utils/validateDeparture";

const duplicateLegMessage = "This train leg is already added.";

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, "Not authorized. Please log in.");
  }
  return req.userId;
}

async function findOwnedSegment(segmentId: string, userId: string) {
  assertValidId(segmentId, "segment id");
  const segment = await JourneySegment.findById(segmentId);
  if (!segment) {
    throw new AppError(404, "Segment not found");
  }
  await assertTripOwner(String(segment.tripId), userId);
  return segment;
}

export async function listSegments(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  await assertTripOwner(tripId, getUserId(req));
  const segments = await JourneySegment.find({ tripId }).sort({ sequence: 1 });
  res.json({ segments });
}

export async function createSegment(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));
  validateDeparture(req.body.departureDate ?? req.body.departure, trip.startDate, trip.endDate);
  const duplicate = await JourneySegment.exists({
    tripId,
    transportMode: "train",
    pnr: req.body.pnr,
    departure: req.body.departure,
  });
  if (duplicate) throw new AppError(409, duplicateLegMessage);

  let sequence = req.body.sequence as number | undefined;
  if (!sequence) {
    const last = await JourneySegment.findOne({ tripId }).sort({ sequence: -1 });
    sequence = last ? last.sequence + 1 : 1;
  }

  const segmentData = { ...req.body };
  delete segmentData.departureDate;
  const segment = await JourneySegment.create({ ...segmentData, sequence, tripId });
  res.status(201).json({ segment });
}

export async function updateSegment(req: Request, res: Response) {
  const segment = await findOwnedSegment(routeParam(req.params.segmentId, "segment id"), getUserId(req));
  const trip = await assertTripOwner(String(segment.tripId), getUserId(req));
  const nextDeparture = req.body.departure ?? segment.departure;
  const nextPnr = req.body.pnr ?? segment.pnr;
  const nextTrainNumber = req.body.trainNumber ?? segment.trainNumber;
  const nextFromStation = req.body.fromStation ?? segment.fromStation;
  const nextToStation = req.body.toStation ?? segment.toStation;
  if (!nextPnr || !/^\d{10}$/.test(nextPnr)) {
    throw new AppError(400, "PNR must be exactly 10 digits.");
  }
  if (!nextTrainNumber || !/^\d{5}$/.test(nextTrainNumber)) {
    throw new AppError(400, "Train number must be exactly 5 digits.");
  }
  if (!nextFromStation) throw new AppError(400, "From station is required.");
  if (!nextToStation) throw new AppError(400, "To station is required.");
  if (!nextDeparture) throw new AppError(400, "Departure is required.");
  validateDeparture(req.body.departureDate ?? nextDeparture, trip.startDate, trip.endDate);
  if (
    nextFromStation &&
    nextToStation &&
    nextFromStation.trim().toLocaleLowerCase() === nextToStation.trim().toLocaleLowerCase()
  ) {
    throw new AppError(400, "From station and to station must be different.");
  }
  const duplicate = await JourneySegment.exists({
    _id: { $ne: segment._id },
    tripId: segment.tripId,
    transportMode: "train",
    pnr: nextPnr,
    departure: nextDeparture,
  });
  if (duplicate) throw new AppError(409, duplicateLegMessage);
  const segmentData = { ...req.body };
  delete segmentData.departureDate;
  Object.assign(segment, segmentData);
  await segment.save();
  res.json({ segment });
}

export async function deleteSegment(req: Request, res: Response) {
  const segment = await findOwnedSegment(routeParam(req.params.segmentId, "segment id"), getUserId(req));
  await segment.deleteOne();
  res.json({ message: "Segment deleted" });
}
