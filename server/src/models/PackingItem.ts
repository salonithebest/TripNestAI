import { Schema, model } from "mongoose";

const packingItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    notes: { type: String, default: "" },
    quantity: { type: Number, default: 1, min: 1 },
    essential: { type: Boolean, default: false },
    packed: { type: Boolean, default: false },
    source: { type: String, enum: ["ai", "manual"], default: "manual" },
  },
  { timestamps: true },
);

packingItemSchema.index({ tripId: 1, packed: 1, category: 1 });

export const PackingItem = model("PackingItem", packingItemSchema);
