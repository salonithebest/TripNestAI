import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { assertTripOwner } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";
import { Document } from "../models/Document";
import { PackingItem } from "../models/PackingItem";
import { getWeatherSummary } from "../services/weatherService";

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, "Not authorized. Please log in.");
  }
  return req.userId;
}

function formatICSDate(date: Date | string): string {
  const value = new Date(date);
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function getReadiness(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));
  const items = await PackingItem.find({ tripId, userId: getUserId(req) }).sort({ essential: -1, category: 1, title: 1 });
  const documents = await Document.find({ tripId, userId: getUserId(req) });

  const packedCount = items.filter((item) => item.packed).length;
  const totalItems = items.length || 1;
  const itemReadiness = Math.min(100, Math.round((packedCount / totalItems) * 100));
  const documentsVerified = documents.filter((document) => document.status === "verified").length;
  const docReadiness = documents.length ? Math.min(100, Math.round((documentsVerified / documents.length) * 100)) : 100;
  const overall = Math.min(100, Math.round(itemReadiness * 0.7 + docReadiness * 0.3));

  const unfinished = items.filter((item) => !item.packed && item.essential).map((item) => item.title);
  const weatherSummary = await getWeatherSummary(trip.destination, trip.startDate);

  res.json({
    overall,
    itemReadiness,
    docReadiness,
    packedCount,
    totalItems,
    documentsVerified,
    totalDocuments: documents.length,
    gaps: unfinished.slice(0, 5),
    weatherSummary,
    summary: `${overall}% ready — ${packedCount}/${totalItems} packing items checked and ${documentsVerified}/${documents.length} travel documents verified.`,
  });
}

export async function exportCalendar(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));

  const start = formatICSDate(trip.startDate);
  const end = formatICSDate(new Date(new Date(trip.endDate).getTime() + 24 * 60 * 60 * 1000));
  const uid = `tripnest-${tripId}-${Date.now()}@tripnest.ai`;
  const summary = trip.title.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, " ");
  const description = `${trip.origin} → ${trip.destination}`.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TripNest AI//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${trip.title}.ics"`);
  res.send(calendar);
}
