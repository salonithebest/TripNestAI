export const TRANSPORT_MODES = ["train", "flight", "bus", "car", "cab"] as const;
export const TRIP_PURPOSES = ["vacation", "business", "family", "pilgrimage", "other"] as const;
export const TRIP_STATUSES = ["planned", "ongoing", "completed", "cancelled"] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number];
export type TripPurpose = (typeof TRIP_PURPOSES)[number];
export type TripStatus = (typeof TRIP_STATUSES)[number];
