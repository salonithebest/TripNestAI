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
    bookingDetails: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

journeySegmentSchema.index({ tripId: 1, sequence: 1 }, { unique: true });

export const JourneySegment = model("JourneySegment", journeySegmentSchema);
