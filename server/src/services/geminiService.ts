import { env } from "../config/env";
import { z } from "zod";
import { AppError } from "../utils/AppError";

async function createGeminiClient() {
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

export type TicketExtraction = {
  trainNumber?: string | null;
  pnr?: string | null;
  passengerName?: string | null;
  departureLocation?: string | null;
  destinationLocation?: string | null;
  departureDate?: string | null;
  ticketStatus?: string | null;
  amount?: number | null;
  notes?: string | null;
  source: "gemini" | "heuristic";
};

const ticketExtractionSchema = z.object({
  trainNumber: z.string().trim().nullable().optional(),
  pnr: z.string().trim().nullable().optional(),
  passengerName: z.string().trim().nullable().optional(),
  departureLocation: z.string().trim().nullable().optional(),
  destinationLocation: z.string().trim().nullable().optional(),
  departureDate: z.string().trim().nullable().optional(),
  ticketStatus: z.string().trim().nullable().optional(),
  amount: z.number().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export type TicketExtractionData = z.infer<typeof ticketExtractionSchema>;

export type TicketUpload = {
  bytes: Buffer;
  mimeType: string;
};

function buildFallbackExtraction(rawText: string): TicketExtraction {
  const normalized = rawText.trim();

  const firstMatch = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return undefined;
  };

  const trainNumber = firstMatch([
    /(?:train|tn|number)\s*[:#-]?\s*([A-Za-z0-9]{4,10})/i,
    /([A-Z]{2,5}\d{2,5})/,
  ]);
  const pnr = firstMatch([/(?:pnr|booking reference|reservation)\s*[:#-]?\s*([A-Z0-9]{5,12})/i]);
  const passengerName = firstMatch([/(?:passenger|traveller|name)\s*[:#-]?\s*([A-Za-z .'-]{2,40})/i]);
  const departureLocation = firstMatch([
    /(?:from|depart(?:ure)? from|origin)\s*[:#-]?\s*([A-Za-z ,.-]{2,50})/i,
    /(?:board(?:ing)? at|from)\s+([A-Za-z ,.-]{2,50})\s*(?:to|destination)/i,
  ]);
  const destinationLocation = firstMatch([
    /(?:to|destination|arrive(?:s|d)? at|going to)\s*[:#-]?\s*([A-Za-z ,.-]{2,50})/i,
    /(?:for|towards)\s+([A-Za-z ,.-]{2,50})/i,
  ]);
  const departureDate = firstMatch([
    /(?:departure|date|journey date|travel date)\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ]);

  return {
    trainNumber,
    pnr,
    passengerName,
    departureLocation,
    destinationLocation,
    departureDate,
    ticketStatus: /confirm|booked|reserved|paid/i.test(normalized) ? "confirmed" : null,
    amount: null,
    notes: normalized.length > 0 ? "Heuristic extraction from uploaded ticket text" : "No ticket content provided",
    source: "heuristic",
  };
}

function parseJsonCandidate(text: string): TicketExtractionData {
  let decoded: unknown;
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    decoded = JSON.parse(clean);
  } catch {
    throw new AppError(502, "Gemini returned ticket details in an invalid format.");
  }

  const parsed = ticketExtractionSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new AppError(502, "Gemini returned ticket details that failed validation.");
  }
  return parsed.data;
}

export async function extractTicketDetails(
  rawText: string,
  tripContext?: Record<string, string | undefined>,
  upload?: TicketUpload,
): Promise<TicketExtraction> {
  const normalizedText = (rawText ?? "").trim();
  if (!normalizedText && !upload) {
    throw new AppError(400, "Enter ticket details or upload a PDF, JPG, or PNG file.");
  }

  if (!env.GEMINI_API_KEY) {
    return buildFallbackExtraction(normalizedText || upload?.bytes.toString("utf8") || "");
  }

  try {
    const client = await createGeminiClient();
    const prompt = `Extract travel ticket details as a JSON object with exactly these keys: trainNumber, pnr, passengerName, departureLocation, destinationLocation, departureDate, ticketStatus, amount, notes. Use strings or null for text fields, a number or null for amount, and null for any field not found. Do not infer missing details. Trip context: ${JSON.stringify(tripContext ?? {})}. ${normalizedText ? `Additional ticket text: ${normalizedText}` : ""}`;
    const parts = [
      { text: prompt },
      ...(upload
        ? [{ inlineData: { mimeType: upload.mimeType, data: upload.bytes.toString("base64") } }]
        : []),
    ];
    const response = await client.models.generateContent({
      model: env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json" },
    });

    if (!response.text) {
      throw new AppError(502, "Gemini returned an empty ticket extraction.");
    }

    return { ...parseJsonCandidate(response.text), source: "gemini" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Gemini ticket extraction failed:", error);
    throw new AppError(502, "Gemini could not extract this ticket. Check the AI service configuration and try again.");
  }
}
