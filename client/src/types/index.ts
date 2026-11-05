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
  weather?: TripWeather | null;
  latitude?: number | null;
  longitude?: number | null;
  forecastAvailable?: boolean;
}

export interface TicketFields {
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
}

export interface TravelDocument {
  _id: string;
  tripId: string;
  documentType: "train_ticket";
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  extractedData: TicketFields;
  verifiedData?: TicketFields | null;
  flaggedFields: string[];
  verificationStatus: "pending_review" | "verified";
  extractionProvider: string;
  createdAt?: string;
}

export type PackingCategory =
  | "clothing"
  | "toiletries"
  | "electronics"
  | "documents"
  | "essentials"
  | "weather"
  | "custom";

export interface PackingItem {
  _id: string;
  tripId: string;
  name: string;
  category: PackingCategory;
  source: "rule" | "ai" | "user";
  reason?: string;
  isPacked: boolean;
}

export interface TripWeather {
  minTemperatureC: number | null;
  maxTemperatureC: number | null;
  rainChance: number | null;
  source: "forecast" | "seasonal";
  label: "Forecast" | "Seasonal estimate";
}

export interface ReadinessSummary {
  tripId?: string;
  percent: number;
  breakdown: {
    documents: number;
    tripDetails: number;
    packing: number;
  };
  formula: string;
  gaps: string[];
  packedCount: number;
  totalItems: number;
  verifiedDocuments: number;
  totalDocuments: number;
}

export type TransportMode = "train";

export interface JourneySegment {
  _id: string;
  tripId: string;
  sequence: number;
  transportMode: TransportMode;
  fromLocation: string;
  toLocation: string;
  fromStation?: string;
  toStation?: string;
  trainNumber?: string;
  pnr?: string;
  coach?: string;
  seatNumber?: string;
  departure?: string;
  arrival?: string;
  bookingDetails: Record<string, unknown>;
}
