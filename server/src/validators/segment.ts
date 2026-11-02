import { z } from "zod";
import { TRANSPORT_MODES } from "../constants";

export const segmentInputSchema = z.object({
  sequence: z.coerce.number().int().min(1).max(50).optional(),
  transportMode: z.enum(TRANSPORT_MODES, { message: "Choose a valid transport mode" }),
  fromLocation: z.string().trim().min(2, "Starting location is required").max(120),
  toLocation: z.string().trim().min(2, "Destination is required").max(120),
  departure: z.coerce.date().optional(),
  arrival: z.coerce.date().optional(),
  bookingDetails: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateSegmentSchema = segmentInputSchema.partial();
