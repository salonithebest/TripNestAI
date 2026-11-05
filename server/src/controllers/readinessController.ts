import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { assertTripOwner } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";
import { Document } from "../models/Document";
import { JourneySegment } from "../models/JourneySegment";
import { PackingItem } from "../models/PackingItem";
import { getTripWeather } from "../services/weatherService";

function getUserId(req: Request): string {
  if (!req.userId) throw new AppError(401, "Not authorized. Please log in.");
  return req.userId;
}

function formatICSDate(date: Date | string): string {
  return new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "");
}

function escapeICS(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function getReadiness(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));
  const [documents, segments, items] = await Promise.all([
    Document.find({ tripId, userId: getUserId(req) }),
    JourneySegment.find({ tripId, transportMode: "train" }).sort({ sequence: 1 }),
    PackingItem.find({ tripId, userId: getUserId(req) }),
  ]);

  const gaps: string[] = [];
  let documentPoints = 0;
  if (documents.length === 0) {
    gaps.push("Upload your train ticket.");
  } else if (documents.some((document) => document.verificationStatus !== "verified")) {
    documentPoints = 15;
    gaps.push("Review and approve your ticket.");
  } else {
    documentPoints = 30;
  }

  let tripDetailsPoints = 0;
  const trainLeg = segments[0];
  if (!trainLeg) {
    gaps.push("Add a train journey.");
  } else {
    tripDetailsPoints += 10;
    if (trainLeg.departure && (trainLeg.pnr || trainLeg.trainNumber)) {
      tripDetailsPoints += 10;
    } else {
      if (!trainLeg.departure) gaps.push("Add the train departure time.");
      if (!trainLeg.pnr && !trainLeg.trainNumber) gaps.push("Add a PNR or train number.");
    }
  }

  const packedCount = items.filter((item) => item.isPacked).length;
  const packingPoints = items.length ? Math.round((packedCount / items.length) * 50) : 0;
  if (items.length === 0) {
    gaps.push("Generate your packing list.");
  } else if (packedCount < items.length) {
    gaps.push(`Pack the remaining ${items.length - packedCount} item(s).`);
  }

  const breakdown = {
    documents: documentPoints,
    tripDetails: tripDetailsPoints,
    packing: packingPoints,
  };
  const percent = documentPoints + tripDetailsPoints + packingPoints;

  res.json({
    percent,
    breakdown,
    formula: "Documents 30 · Trip details 20 · Packing 50.",
    gaps,
    packedCount,
    totalItems: items.length,
    verifiedDocuments: documents.filter((document) => document.verificationStatus === "verified").length,
    totalDocuments: documents.length,
    tripId: String(trip._id),
  });
}

export async function getWeather(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));
  const result = await getTripWeather(trip);
  res.json({
    weather: result.weather,
    forecastAvailable: result.forecastAvailable,
    latitude: trip.latitude,
    longitude: trip.longitude,
  });
}

export async function exportCalendar(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));
  const legs = await JourneySegment.find({ tripId, transportMode: "train" }).sort({ sequence: 1 });
  if (legs.length === 0) throw new AppError(404, "Add a train journey first.");

  const events = legs.map((leg) => {
    const departure = leg.departure ?? trip.startDate;
    const trainNumber = leg.trainNumber || "Unknown";
    const from = leg.fromStation || leg.fromLocation;
    const to = leg.toStation || leg.toLocation;
    const maskedPnr = leg.pnr ? `***${leg.pnr.slice(-4)}` : "Not provided";
    return [
      "BEGIN:VEVENT",
      `UID:${leg.id}@tripnest`,
      `DTSTAMP:${formatICSDate(new Date())}Z`,
      `DTSTART:${formatICSDate(departure)}Z`,
      `SUMMARY:${escapeICS(`Train ${trainNumber}: ${from} to ${to}`)}`,
      `DESCRIPTION:${escapeICS(`PNR: ${maskedPnr}`)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TripNest AI//EN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
  const fileTitle = trip.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="tripnest-${fileTitle}.ics"`);
  res.send(calendar);
}
