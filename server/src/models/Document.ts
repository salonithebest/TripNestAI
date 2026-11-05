import { Schema, model } from "mongoose";

const documentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    documentType: { type: String, enum: ["train_ticket"], default: "train_ticket", required: true },
    originalFileName: { type: String, trim: true, maxlength: 255, default: "" },
    mimeType: { type: String, default: "" },
    fileSize: { type: Number, min: 0, default: 0 },
    extractedData: { type: Schema.Types.Mixed, default: {} },
    verifiedData: { type: Schema.Types.Mixed, default: null },
    flaggedFields: { type: [String], default: [] },
    verificationStatus: {
      type: String,
      enum: ["pending_review", "verified"],
      default: "pending_review",
    },
    extractionProvider: { type: String, default: "gemini" },
  },
  { timestamps: true },
);

documentSchema.index({ tripId: 1, createdAt: -1 });
documentSchema.index({ userId: 1 });

export const Document = model("Document", documentSchema);
