import type { TransportMode } from "./types";

export const PACKING_CATEGORIES = [
  "clothing",
  "toiletries",
  "electronics",
  "documents",
  "essentials",
  "weather",
  "custom",
] as const;

export const TRANSPORT_OPTIONS: { value: TransportMode; label: string }[] = [
  { value: "train", label: "Train" },
];

export const PURPOSE_OPTIONS = [
  { value: "vacation", label: "Vacation" },
  { value: "business", label: "Business" },
  { value: "family", label: "Family visit" },
  { value: "pilgrimage", label: "Pilgrimage" },
  { value: "other", label: "Other" },
];
