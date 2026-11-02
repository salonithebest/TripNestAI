import { z } from "zod";
import { TRIP_PURPOSES, TRIP_STATUSES } from "../constants";

const tripBase = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  origin: z.string().trim().min(2, "Origin is required").max(100),
  destination: z.string().trim().min(2, "Destination is required").max(100),
  startDate: z.coerce.date({ message: "Start date is invalid" }),
  endDate: z.coerce.date({ message: "End date is invalid" }),
  purpose: z.enum(TRIP_PURPOSES).default("vacation"),
  notes: z.string().trim().max(500).optional().default(""),
  status: z.enum(TRIP_STATUSES).optional(),
});

export const createTripSchema = tripBase.refine((trip) => trip.endDate >= trip.startDate, {
  message: "End date must be on or after the start date",
  path: ["endDate"],
});

export const updateTripSchema = tripBase.partial();
