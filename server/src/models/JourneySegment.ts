import { Schema, model } from "mongoose";
import { TRANSPORT_MODES } from "../constants";

const journeySegmentSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    sequence: { type: Number, required: true, min: 1 },
    transportMode: { type: String, enum: [...TRANSPORT_MODES], required: true },
    fromLocation: { type: String, required: true, trim: true, maxlength: 120 },
    toLocation: { type: String, required: true, trim: true, maxlength: 120 },
    departure: { type: Date },
    arrival: { type: Date },
    trainNumber: { type: String, trim: true, maxlength: 100 },
    pnr: { type: String, trim: true, maxlength: 100 },
    coach: { type: String, trim: true, maxlength: 100 },
    seatNumber: { type: String, trim: true, maxlength: 100 },
    fromStation: { type: String, trim: true, maxlength: 100 },
    toStation: { type: String, trim: true, maxlength: 100 },
    bookingDetails: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, autoIndex: false },
);

journeySegmentSchema.index({ tripId: 1, sequence: 1 }, { unique: true });
journeySegmentSchema.index(
  { tripId: 1, pnr: 1, departure: 1 },
  {
    unique: true,
    name: "unique_train_trip_pnr_departure",
    partialFilterExpression: {
      transportMode: "train",
      pnr: { $type: "string" },
      departure: { $type: "date" },
    },
  },
);

export const JourneySegment = model("JourneySegment", journeySegmentSchema);
