import type { TransportMode } from "./types";

export const PACKING_CATEGORIES = [
  "Documents",
  "Electronics",
  "Toiletries",
  "Essentials",
  "Footwear",
  "Clothing",
  "Health",
  "Accessories",
  "Leisure",
  "Food",
  "Custom",
] as const;

export const TRANSPORT_OPTIONS: { value: TransportMode; label: string }[] = [
  { value: "train", label: "Train" },
  { value: "flight", label: "Flight" },
  { value: "bus", label: "Bus" },
  { value: "car", label: "Car" },
  { value: "cab", label: "Cab" },
];

export const PURPOSE_OPTIONS = [
  { value: "vacation", label: "Vacation" },
  { value: "business", label: "Business" },
  { value: "family", label: "Family visit" },
  { value: "pilgrimage", label: "Pilgrimage" },
  { value: "other", label: "Other" },
];
