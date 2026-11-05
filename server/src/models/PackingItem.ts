import { Schema, model } from "mongoose";
import { PACKING_CATEGORIES } from "../constants";

const packingItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, enum: [...PACKING_CATEGORIES], required: true, trim: true },
    source: { type: String, enum: ["rule", "ai", "user"], required: true, default: "user" },
    reason: { type: String, trim: true, maxlength: 160, default: "" },
    isPacked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

packingItemSchema.index({ tripId: 1, isPacked: 1, category: 1 });

export const PackingItem = model("PackingItem", packingItemSchema);
