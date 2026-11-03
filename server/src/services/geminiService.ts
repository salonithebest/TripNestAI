import { env } from "../config/env";

async function createGeminiClient() {
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

export type TicketExtraction = {
  trainNumber?: string;
  pnr?: string;
  passengerName?: string;
  departureLocation?: string;
  destinationLocation?: string;
  departureDate?: string;
  ticketStatus?: string;
  amount?: number | null;
  notes?: string;
  source: "gemini" | "heuristic";
};

function buildFallbackExtraction(rawText: string, tripContext?: Record<string, string | undefined>): TicketExtraction {
  const normalized = rawText.trim();
  const combined = `${normalized} ${JSON.stringify(tripContext ?? {})}`;

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
    departureLocation: departureLocation ?? tripContext?.origin,
    destinationLocation: destinationLocation ?? tripContext?.destination,
    departureDate: departureDate ?? tripContext?.startDate,
    ticketStatus: /confirm|booked|reserved|paid/i.test(combined) ? "confirmed" : "pending_review",
    amount: undefined,
    notes: normalized.length > 0 ? "Heuristic extraction from uploaded ticket text" : "No ticket content provided",
    source: "heuristic",
  };
}

function parseJsonCandidate(text: string): TicketExtraction | null {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === "object") {
      return {
        trainNumber: parsed.trainNumber ?? parsed.train_number,
        pnr: parsed.pnr ?? parsed.bookingReference,
        passengerName: parsed.passengerName ?? parsed.passenger_name,
        departureLocation: parsed.departureLocation ?? parsed.departure_location,
        destinationLocation: parsed.destinationLocation ?? parsed.destination_location,
        departureDate: parsed.departureDate ?? parsed.departure_date,
        ticketStatus: parsed.ticketStatus ?? parsed.status,
        amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
        notes: parsed.notes,
        source: "gemini",
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function extractTicketDetails(
  rawText: string,
  tripContext?: Record<string, string | undefined>,
): Promise<TicketExtraction> {
  const normalizedText = (rawText ?? "").trim();
  if (!normalizedText) {
    return buildFallbackExtraction("", tripContext);
  }

  const client = env.GEMINI_API_KEY ? await createGeminiClient() : null;
  if (!client) {
    return buildFallbackExtraction(normalizedText, tripContext);
  }

  try {
    const response = (await client.models.generateContent({
      model: env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: [
        {
          text: `Extract the travel ticket details as strict JSON with keys: trainNumber, pnr, passengerName, departureLocation, destinationLocation, departureDate, ticketStatus, amount, notes. Use the trip context when text is incomplete. Context: ${JSON.stringify(tripContext ?? {})}\nTicket text:\n${normalizedText}`,
        },
      ],
    })) as any;

    const parsedText =
      response?.text ??
      response?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ??
      "";

    const candidate = parseJsonCandidate(parsedText);
    if (candidate) {
      return { ...buildFallbackExtraction(normalizedText, tripContext), ...candidate, source: "gemini" };
    }
  } catch {
    // Fall back to a rule-based extraction when the API is unavailable.
  }

  return buildFallbackExtraction(normalizedText, tripContext);
}
