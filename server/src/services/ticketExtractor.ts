import { z } from "zod";
import { env, getGeminiConfigurationError } from "../config/env";
import { AppError } from "../utils/AppError";
import { generateWithGemini, getGeminiStatus } from "./geminiClient";

export const TICKET_INSTRUCTIONS =
  "You read Indian railway e-tickets and PNR printouts. Return only one JSON object with these keys: pnr, trainNumber, trainName, passengerName, fromStation, toStation, departureDate, departureTime, coach, seatNumber, bookingStatus. Rules: pnr is exactly 10 digits. trainNumber is exactly 5 digits. departureDate is YYYY-MM-DD. departureTime is 24-hour HH:MM. If a value is not clearly readable, use null. Never guess, never infer from other fields, never invent. Do not write any text outside the JSON.";

const textField = z.string().trim().max(100).nullable();
const extractedTicketSchema = z.object({
  pnr: z.unknown().optional(),
  trainNumber: z.unknown().optional(),
  trainName: z.unknown().optional(),
  passengerName: z.unknown().optional(),
  fromStation: z.unknown().optional(),
  toStation: z.unknown().optional(),
  departureDate: z.unknown().optional(),
  departureTime: z.unknown().optional(),
  coach: z.unknown().optional(),
  seatNumber: z.unknown().optional(),
  bookingStatus: z.unknown().optional(),
}).passthrough();

export type TicketFields = {
  pnr: string | null;
  trainNumber: string | null;
  trainName: string | null;
  passengerName: string | null;
  fromStation: string | null;
  toStation: string | null;
  departureDate: string | null;
  departureTime: string | null;
  coach: string | null;
  seatNumber: string | null;
  bookingStatus: string | null;
};

export type TicketExtractionResult = {
  fields: TicketFields;
  flaggedFields: string[];
};

export type TicketFile = {
  bytes: Buffer;
  mimeType: string;
};

const fields = Object.keys(extractedTicketSchema.shape) as (keyof TicketFields)[];
const requiredFields: (keyof TicketFields)[] = [
  "pnr",
  "trainNumber",
  "departureDate",
  "fromStation",
  "toStation",
];

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateTicketFields(value: unknown): TicketExtractionResult {
  const decoded = extractedTicketSchema.safeParse(value);
  if (!decoded.success) {
    throw new AppError(400, "Ticket details must be a JSON object.");
  }

  const output = {} as TicketFields;
  const flaggedFields = new Set<string>();

  for (const field of fields) {
    const raw = decoded.data[field];
    if (raw === null || raw === undefined || raw === "") {
      output[field] = null;
      if (requiredFields.includes(field)) flaggedFields.add(field);
      continue;
    }

    const parsedText = textField.safeParse(raw);
    if (!parsedText.success) {
      output[field] = null;
      flaggedFields.add(field);
      continue;
    }

    const text = parsedText.data;
    if (
      (field === "pnr" && text !== null && !/^\d{10}$/.test(text)) ||
      (field === "trainNumber" && text !== null && !/^\d{5}$/.test(text)) ||
      (field === "departureDate" && text !== null && !isRealDate(text)) ||
      (field === "departureTime" && text !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(text))
    ) {
      output[field] = null;
      flaggedFields.add(field);
      continue;
    }

    output[field] = text;
  }

  return { fields: output, flaggedFields: [...flaggedFields] };
}

function responseText(response: { text?: string }): string {
  return response.text ?? "";
}

function getProviderErrorMessage(error: unknown): string {
  const status = getGeminiStatus(error);
  if (status === 401 || status === 403) {
    return "Gemini rejected the configured key. Check GEMINI_API_KEY in server/.env.";
  }
  if (status === 404) {
    return "The configured Gemini model is unavailable. Check GEMINI_MODEL in server/.env.";
  }
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return "Gemini is temporarily busy. Please retry shortly or enter the details manually.";
  }
  return "We could not read this ticket. Please check the photo or enter the details manually.";
}

export async function extractTicket(file: TicketFile): Promise<TicketExtractionResult> {
  const configurationError = getGeminiConfigurationError();
  if (configurationError) throw new AppError(503, configurationError);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const startedAt = Date.now();
    let response;
    try {
      response = await generateWithGemini("ticket extraction", (client) =>
        client.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { text: TICKET_INSTRUCTIONS },
                { inlineData: { mimeType: file.mimeType, data: file.bytes.toString("base64") } },
              ],
            },
          ],
          config: { responseMimeType: "application/json" },
        }),
      );
    } catch (error) {
      throw new AppError(503, getProviderErrorMessage(error));
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText(response));
    } catch {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        provider: "gemini",
        operation: "ticket extraction",
        status: "invalid_json",
        attempt: attempt + 1,
      }));
      if (attempt === 0) continue;
      throw new AppError(502, "Gemini could not read this ticket. Please check the photo or enter the details manually.");
    }

    const result = validateTicketFields(parsed);
    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      provider: "gemini",
      operation: "ticket extraction",
      status: "success",
      durationMs: Date.now() - startedAt,
      fieldsFound: Object.values(result.fields).filter((field) => field !== null).length,
      flaggedFields: result.flaggedFields.length,
    }));
    return result;
  }

  throw new AppError(502, "Gemini could not read this ticket. Please enter the details manually.");
}
