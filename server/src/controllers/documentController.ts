import type { Request, Response } from "express";
import multer from "multer";
import { Document } from "../models/Document";
import { Trip } from "../models/Trip";
import { AppError } from "../utils/AppError";
import { assertTripOwner, assertValidId } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";
import { extractTicketDetails } from "../services/geminiService";

export const uploadDocumentMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["text/plain", "application/pdf", "image/jpeg", "image/png", "application/json"];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(txt|json|pdf|png|jpg|jpeg)$/i)) {
      cb(null, true);
      return;
    }
    cb(null, false);
  },
});

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, "Not authorized. Please log in.");
  }
  return req.userId;
}

async function findOwnedDocument(documentId: string, userId: string) {
  assertValidId(documentId, "document id");
  const document = await Document.findById(documentId);
  if (!document) {
    throw new AppError(404, "Document not found");
  }

  const trip = await Trip.findById(document.tripId);
  if (!trip || String(trip.userId) !== userId) {
    throw new AppError(403, "You do not have access to this document");
  }

  return document;
}

export async function listDocuments(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  await assertTripOwner(tripId, getUserId(req));
  const documents = await Document.find({ tripId }).sort({ createdAt: -1 });
  res.json({ documents });
}

export async function createDocument(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));
  const userId = getUserId(req);

  const bodyTitle = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const bodyType = typeof req.body.type === "string" ? req.body.type : "other";
  const bodyContent = typeof req.body.content === "string" ? req.body.content.trim() : "";
  const uploadText = req.file ? req.file.buffer.toString("utf-8").trim() : "";
  const content = uploadText || bodyContent;

  if (!content && !req.file) {
    throw new AppError(400, "Add ticket text or upload a document to save it.");
  }

  const extracted = await extractTicketDetails(content || "", {
    title: trip.title,
    origin: trip.origin,
    destination: trip.destination,
    startDate: String(trip.startDate),
    endDate: String(trip.endDate),
    purpose: trip.purpose,
  });

  const document = await Document.create({
    userId,
    tripId,
    title: bodyTitle || req.file?.originalname || "Travel document",
    type: ["ticket", "passport", "voucher", "other"].includes(bodyType) ? bodyType : "other",
    fileName: req.file?.originalname ?? "",
    fileType: req.file?.mimetype ?? "text/plain",
    content,
    extractedData: extracted,
    status: extracted.ticketStatus === "confirmed" ? "verified" : "pending_review",
  });

  res.status(201).json({ document });
}

export async function reviewDocument(req: Request, res: Response) {
  const document = await findOwnedDocument(routeParam(req.params.documentId, "document id"), getUserId(req));
  const nextStatus = typeof req.body.status === "string" ? req.body.status : document.status;
  if (!["pending_review", "verified", "rejected"].includes(nextStatus)) {
    throw new AppError(400, "Status must be pending_review, verified, or rejected");
  }

  document.status = nextStatus;
  if (typeof req.body.notes === "string") document.notes = req.body.notes;
  await document.save();
  res.json({ document });
}

export async function deleteDocument(req: Request, res: Response) {
  const document = await findOwnedDocument(routeParam(req.params.documentId, "document id"), getUserId(req));
  await document.deleteOne();
  res.json({ message: "Document deleted" });
}
