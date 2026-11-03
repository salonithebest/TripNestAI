export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Trip {
  _id: string;
  title: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  notes?: string;
  status: string;
}

export type TravelDocumentStatus = "pending_review" | "verified" | "rejected";

export interface TravelDocument {
  _id: string;
  tripId: string;
  title: string;
  type: "ticket" | "passport" | "voucher" | "other";
  fileName?: string;
  fileType?: string;
  content?: string;
  status: TravelDocumentStatus;
  extractedData?: TicketExtractionData;
  createdAt?: string;
}

export interface TicketExtractionData {
  trainNumber?: string | null;
  pnr?: string | null;
  passengerName?: string | null;
  departureLocation?: string | null;
  destinationLocation?: string | null;
  departureDate?: string | null;
  ticketStatus?: string | null;
  amount?: number | null;
  notes?: string | null;
  source?: "gemini" | "heuristic";
}

export interface PackingItem {
  _id: string;
  tripId: string;
  title: string;
  category: string;
  quantity: number;
  essential: boolean;
  packed: boolean;
  notes?: string;
  source?: "ai" | "manual";
}

export interface ReadinessSummary {
  overall: number;
  itemReadiness: number;
  docReadiness: number;
  packedCount: number;
  totalItems: number;
  documentsVerified: number;
  totalDocuments: number;
  gaps: string[];
  summary: string;
  weatherSummary?: {
    location: string;
    date: string;
    temperatureC: number;
    precipitationChance: number;
    summary: string;
  };
}

export type TransportMode = "train" | "flight" | "bus" | "car" | "cab";

export interface JourneySegment {
  _id: string;
  tripId: string;
  sequence: number;
  transportMode: TransportMode;
  fromLocation: string;
  toLocation: string;
  departure?: string;
  arrival?: string;
  bookingDetails: Record<string, unknown>;
}
