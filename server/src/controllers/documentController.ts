import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { Document } from "../models/Document";
import { JourneySegment } from "../models/JourneySegment";
import { Trip } from "../models/Trip";
import { AppError } from "../utils/AppError";
import { assertTripOwner, assertValidId } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";
import { validateDeparture } from "../utils/validateDeparture";
import { extractTicket } from "../services/ticketExtractor";

const ticketMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
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
          : "Upload a PDF, JPG or PNG.";
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
  fields: z.object({
    pnr: z.string().regex(/^\d{10}$/, "PNR must be exactly 10 digits").nullable(),
    trainNumber: z.string().regex(/^\d{5}$/, "Train number must be exactly 5 digits").nullable(),
    trainName: z.string().trim().max(100).nullable(),
    passengerName: z.string().trim().max(100).nullable(),
    fromStation: z.string().trim().max(100).nullable(),
    toStation: z.string().trim().max(100).nullable(),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Departure date must be YYYY-MM-DD").nullable(),
    departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Departure time must be HH:MM").nullable(),
    coach: z.string().trim().max(100).nullable(),
    seatNumber: z.string().trim().max(100).nullable(),
    bookingStatus: z.string().trim().max(100).nullable(),
  }),
  approve: z.boolean(),
}).superRefine(({ fields, approve }, context) => {
  if (!approve) return;
  if (!fields.pnr) {
    context.addIssue({ code: "custom", path: ["fields", "pnr"], message: "PNR must be exactly 10 digits." });
  }
  if (!fields.trainNumber) {
    context.addIssue({
      code: "custom",
      path: ["fields", "trainNumber"],
      message: "Train number must be exactly 5 digits.",
    });
  }
  if (!fields.fromStation) {
    context.addIssue({ code: "custom", path: ["fields", "fromStation"], message: "From station is required." });
  }
  if (!fields.toStation) {
    context.addIssue({ code: "custom", path: ["fields", "toStation"], message: "To station is required." });
  } else if (
    fields.fromStation &&
    fields.fromStation.trim().toLocaleLowerCase() === fields.toStation.trim().toLocaleLowerCase()
  ) {
    context.addIssue({
      code: "custom",
      path: ["fields", "toStation"],
      message: "From station and to station must be different.",
    });
  }
  if (!fields.departureDate) {
    context.addIssue({ code: "custom", path: ["fields", "departureDate"], message: "Departure date is required." });
  }
});

const manualFieldsSchema = z.object({
  pnr: z.string().regex(/^\d{10}$/, "PNR must be exactly 10 digits").nullable(),
  trainNumber: z.string().regex(/^\d{5}$/, "Train number must be exactly 5 digits").nullable(),
  trainName: z.string().trim().max(100).nullable(),
  passengerName: z.string().trim().max(100).nullable(),
  fromStation: z.string().trim().max(100).nullable(),
  toStation: z.string().trim().max(100).nullable(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Departure date must be YYYY-MM-DD").nullable(),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Departure time must be HH:MM").nullable(),
  coach: z.string().trim().max(100).nullable(),
  seatNumber: z.string().trim().max(100).nullable(),
  bookingStatus: z.string().trim().max(100).nullable(),
});

type UserRequest = Request & { userId?: string };

function getUserId(req: Request): string {
  const userId = (req as UserRequest).userId;
  if (!userId) throw new AppError(401, "Not authorized. Please log in.");
  return userId;
}

async function findOwnedDocument(documentId: string, userId: string) {
  assertValidId(documentId, "document id");
  const document = await Document.findOne({ _id: documentId, userId });
  if (!document) throw new AppError(404, "Document not found");
  return document;
}

export async function listDocuments(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  await assertTripOwner(tripId, getUserId(req));
  const documents = await Document.find({ tripId, userId: getUserId(req) }).sort({ createdAt: -1 });
  res.json({ documents });
}

export async function createDocument(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));
  const file = req.file;

  if (!file || !ticketMimeTypes.includes(file.mimetype)) {
    throw new AppError(400, "Upload a PDF, JPG or PNG.");
  }

  const extraction = await extractTicket({ bytes: file.buffer, mimeType: file.mimetype });
  const document = await Document.create({
    userId: getUserId(req),
    tripId,
    documentType: "train_ticket",
    originalFileName: file.originalname.replace(/[\\/]/g, "_").slice(0, 255),
    mimeType: file.mimetype,
    fileSize: file.size,
    extractedData: extraction.fields,
    flaggedFields: extraction.flaggedFields,
    verificationStatus: "pending_review",
    extractionProvider: "gemini",
  });

  res.status(201).json({ document, tripDestination: trip.destination });
}

export async function createManualDocument(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  await assertTripOwner(tripId, getUserId(req));
  const result = manualFieldsSchema.safeParse(req.body.fields);
  if (!result.success) {
    throw new AppError(400, result.error.issues[0]?.message ?? "Invalid ticket details.");
  }

  const extractedData = result.data;
  const requiredFields = ["pnr", "trainNumber", "departureDate", "fromStation", "toStation"] as const;
  const flaggedFields = requiredFields.filter((field) => extractedData[field] === null);
  const document = await Document.create({
    userId: getUserId(req),
    tripId,
    documentType: "train_ticket",
    extractedData,
    flaggedFields,
    verificationStatus: "pending_review",
    extractionProvider: "manual",
  });
  res.status(201).json({ document });
}

export async function reviewDocument(req: Request, res: Response) {
  const document = await findOwnedDocument(
    routeParam(req.params.documentId, "document id"),
    getUserId(req),
  );
  const result = reviewSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(400, result.error.issues[0]?.message ?? "Invalid ticket details.");
  }

  const { fields, approve } = result.data;
  if (fields.departureDate) {
    const [year, month, day] = fields.departureDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new AppError(400, "Departure date must be a real calendar date.");
    }
  }

  const trip = approve ? await assertTripOwner(String(document.tripId), getUserId(req)) : null;
  if (trip) {
    if (!fields.pnr) throw new AppError(400, "PNR must be exactly 10 digits.");
    if (!fields.trainNumber) throw new AppError(400, "Train number must be exactly 5 digits.");
    if (!fields.fromStation || !fields.toStation) {
      throw new AppError(400, "From station and to station are required.");
    }
    if (!fields.departureDate) throw new AppError(400, "Departure date is required.");
    validateDeparture(fields.departureDate ?? undefined, trip.startDate, trip.endDate);
    const departure = new Date(`${fields.departureDate}T${fields.departureTime ?? "00:00"}:00.000Z`);
    const matchingPnr = await JourneySegment.findOne({
      tripId: trip._id,
      transportMode: "train",
      pnr: fields.pnr,
    });
    const segment =
      matchingPnr ??
      new JourneySegment({
        tripId: trip._id,
        sequence: (await JourneySegment.countDocuments({ tripId: trip._id })) + 1,
        transportMode: "train",
        fromLocation: fields.fromStation,
        toLocation: fields.toStation,
      });

    segment.transportMode = "train";
    segment.fromLocation = fields.fromStation;
    segment.toLocation = fields.toStation;
    segment.fromStation = fields.fromStation;
    segment.toStation = fields.toStation;
    segment.trainNumber = fields.trainNumber;
    segment.pnr = fields.pnr;
    segment.coach = fields.coach ?? undefined;
    segment.seatNumber = fields.seatNumber ?? undefined;
    segment.departure = departure;
    await segment.save();
  }

  document.verifiedData = fields;
  document.verificationStatus = approve ? "verified" : "pending_review";
  await document.save();

  res.json({ document });
}

export async function deleteDocument(req: Request, res: Response) {
  const document = await findOwnedDocument(
    routeParam(req.params.documentId, "document id"),
    getUserId(req),
  );
  await document.deleteOne();
  res.json({ message: "Document deleted" });
}
