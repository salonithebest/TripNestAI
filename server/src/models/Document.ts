import { Schema, model } from "mongoose";

const documentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    type: {
      type: String,
      enum: ["ticket", "passport", "voucher", "other"],
      default: "other",
    },
    fileName: { type: String, default: "" },
    fileType: { type: String, default: "text/plain" },
    content: { type: String, default: "" },
    extractedData: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending_review", "verified", "rejected"],
      default: "pending_review",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

documentSchema.index({ tripId: 1, createdAt: -1 });

export const Document = model("Document", documentSchema);
