import { z } from "zod";
import { TRANSPORT_MODES } from "../constants";

const segmentBaseSchema = z.object({
  sequence: z.coerce.number().int().min(1).max(50).optional(),
  transportMode: z.enum(TRANSPORT_MODES, { message: "Choose a valid transport mode" }),
  fromLocation: z.string().trim().min(2, "Starting location is required").max(120),
  toLocation: z.string().trim().min(2, "Destination is required").max(120),
  fromStation: z.string().trim().min(2, "From station is required").max(100),
  toStation: z.string().trim().min(2, "To station is required").max(100),
  departure: z.coerce.date({ error: "Departure is required." }),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Departure date must be YYYY-MM-DD").optional(),
  arrival: z.coerce.date().optional(),
  trainNumber: z.string().trim().regex(/^\d{5}$/, "Train number must be exactly 5 digits."),
  pnr: z.string().trim().regex(/^\d{10}$/, "PNR must be exactly 10 digits."),
  coach: z.string().trim().max(100).optional(),
  seatNumber: z.string().trim().max(100).optional(),
  bookingDetails: z.record(z.string(), z.unknown()).optional().default({}),
});

function validateStations(
  value: { fromStation?: string; toStation?: string },
  context: z.RefinementCtx,
): void {
  if (
    value.fromStation &&
    value.toStation &&
    value.fromStation.trim().toLocaleLowerCase() === value.toStation.trim().toLocaleLowerCase()
  ) {
    context.addIssue({
      code: "custom",
      path: ["toStation"],
      message: "From station and to station must be different.",
    });
  }
}

export const segmentInputSchema = segmentBaseSchema.superRefine(validateStations);
export const updateSegmentSchema = segmentBaseSchema.partial().superRefine(validateStations);
