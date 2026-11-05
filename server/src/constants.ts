export const TRANSPORT_MODES = ["train"] as const;
export const TRIP_PURPOSES = ["vacation", "business", "family", "pilgrimage", "other"] as const;
export const TRIP_STATUSES = ["planned", "ongoing", "completed", "cancelled"] as const;
export const PACKING_CATEGORIES = [
  "clothing",
  "toiletries",
  "electronics",
  "documents",
  "essentials",
  "weather",
  "custom",
] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number];
export type TripPurpose = (typeof TRIP_PURPOSES)[number];
export type TripStatus = (typeof TRIP_STATUSES)[number];
export type PackingCategory = (typeof PACKING_CATEGORIES)[number];
