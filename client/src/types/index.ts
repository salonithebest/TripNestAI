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
