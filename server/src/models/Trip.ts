import { Schema, model } from "mongoose";
import { TRIP_PURPOSES, TRIP_STATUSES } from "../constants";

const tripSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    origin: { type: String, required: true, trim: true, maxlength: 100 },
    destination: { type: String, required: true, trim: true, maxlength: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    purpose: { type: String, enum: [...TRIP_PURPOSES], default: "vacation" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    status: { type: String, enum: [...TRIP_STATUSES], default: "planned" },
    weather: { type: Schema.Types.Mixed, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    forecastAvailable: { type: Boolean, default: false },
    weatherUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

tripSchema.index({ userId: 1, startDate: 1 });

export const Trip = model("Trip", tripSchema);
