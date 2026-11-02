import type { Request, Response } from "express";
import { JourneySegment } from "../models/JourneySegment";
import { AppError } from "../utils/AppError";
import { assertTripOwner, assertValidId } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";

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
  await assertTripOwner(tripId, getUserId(req));

  let sequence = req.body.sequence as number | undefined;
  if (!sequence) {
    const last = await JourneySegment.findOne({ tripId }).sort({ sequence: -1 });
    sequence = last ? last.sequence + 1 : 1;
  }

  const segment = await JourneySegment.create({ ...req.body, sequence, tripId });
  res.status(201).json({ segment });
}

export async function updateSegment(req: Request, res: Response) {
  const segment = await findOwnedSegment(routeParam(req.params.segmentId, "segment id"), getUserId(req));
  Object.assign(segment, req.body);
  await segment.save();
  res.json({ segment });
}

export async function deleteSegment(req: Request, res: Response) {
  const segment = await findOwnedSegment(routeParam(req.params.segmentId, "segment id"), getUserId(req));
  await segment.deleteOne();
  res.json({ message: "Segment deleted" });
}
