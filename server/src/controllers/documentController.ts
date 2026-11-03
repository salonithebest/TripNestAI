import type { Request, Response } from "express";
import type { NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import { Document } from "../models/Document";
import { Trip } from "../models/Trip";
import { AppError } from "../utils/AppError";
import { assertTripOwner, assertValidId } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";
import { extractTicketDetails } from "../services/geminiService";

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("file");

export function uploadDocumentMiddleware(req: Request, res: Response, next: NextFunction) {
  uploadDocument(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "The uploaded file must be 5 MB or smaller."
          : `Unable to process uploaded file: ${error.message}`;
      next(new AppError(400, message));
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
}

const reviewSchema = z.object({
  status: z.enum(["pending_review", "verified", "rejected"]).optional(),
  notes: z.string().max(2000).optional(),
  extractedData: z.object({
    trainNumber: z.string().nullable().optional(),
    pnr: z.string().nullable().optional(),
    passengerName: z.string().nullable().optional(),
    departureLocation: z.string().nullable().optional(),
    destinationLocation: z.string().nullable().optional(),
    departureDate: z.string().nullable().optional(),
    ticketStatus: z.string().nullable().optional(),
    amount: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    source: z.enum(["gemini", "heuristic"]).optional(),
  }).optional(),
});

function isSupportedTicket(file: NonNullable<Request["file"]>): boolean {
  const extension = file.originalname.toLowerCase().split(".").pop();
  const header = file.buffer.subarray(0, 8);

  if (extension === "pdf") {
    return file.mimetype === "application/pdf" && header.subarray(0, 5).toString() === "%PDF-";
  }
  if (extension === "jpg" || extension === "jpeg") {
    return file.mimetype === "image/jpeg" && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (extension === "png") {
    return file.mimetype === "image/png" && header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return false;
}

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
  if (req.file && !isSupportedTicket(req.file)) {
    throw new AppError(400, "Upload a valid PDF, JPG, or PNG file.");
  }

  if (!bodyContent && !req.file) {
    throw new AppError(400, "Enter ticket details manually or upload a PDF, JPG, or PNG file.");
  }

  const extracted = await extractTicketDetails(bodyContent, {
    title: trip.title,
    origin: trip.origin,
    destination: trip.destination,
    startDate: String(trip.startDate),
    endDate: String(trip.endDate),
    purpose: trip.purpose,
  }, req.file ? { bytes: req.file.buffer, mimeType: req.file.mimetype } : undefined);

  const document = await Document.create({
    userId,
    tripId,
    title: bodyTitle || req.file?.originalname || "Travel document",
    type: ["ticket", "passport", "voucher", "other"].includes(bodyType) ? bodyType : "other",
    fileName: req.file?.originalname ?? "",
    fileType: req.file?.mimetype ?? "text/plain",
    content: bodyContent,
    extractedData: extracted,
    status: "pending_review",
  });

  res.status(201).json({ document });
}

export async function reviewDocument(req: Request, res: Response) {
  const document = await findOwnedDocument(routeParam(req.params.documentId, "document id"), getUserId(req));
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "Invalid document review data.");
  }

  if (parsed.data.status) document.status = parsed.data.status;
  if (parsed.data.notes !== undefined) document.notes = parsed.data.notes;
  if (parsed.data.extractedData) document.extractedData = parsed.data.extractedData;
  await document.save();
  res.json({ document });
}

export async function deleteDocument(req: Request, res: Response) {
  const document = await findOwnedDocument(routeParam(req.params.documentId, "document id"), getUserId(req));
  await document.deleteOne();
  res.json({ message: "Document deleted" });
}
