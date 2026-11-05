import { z } from "zod";
import { env } from "../config/env";
import { PACKING_CATEGORIES } from "../constants";
import { generateWithGemini, getGeminiStatus } from "./geminiClient";
import type { TripWeather } from "./weatherService";

export type PackingSuggestion = {
  name: string;
  category: (typeof PACKING_CATEGORIES)[number];
  source: "rule" | "ai";
  reason: string;
  isPacked: boolean;
};

const hillStationNames = [
  "manali",
  "shimla",
  "mussoorie",
  "nainital",
  "darjeeling",
  "ooty",
  "munnar",
  "leh",
  "srinagar",
  "gangtok",
];

export function generatePackingRules(
  trip: { destination: string; purpose: string; startDate: Date; endDate: Date },
  weather: TripWeather | null,
  segments: { departure?: Date | null }[],
): PackingSuggestion[] {
  const result: PackingSuggestion[] = [];
  const add = (name: string, category: PackingSuggestion["category"], reason = "") =>
    result.push({ name, category, source: "rule", reason, isPacked: false });

  add("Train ticket (printed or saved)", "documents");
  add("Government ID", "documents");
  add("Phone", "electronics");
  add("Phone charger", "electronics");
  add("Power bank", "electronics");
  add("Toothbrush and toothpaste", "toiletries");
  add("Soap or body wash", "toiletries");
  add("Medicines", "essentials");
  add("Wallet", "essentials");
  add("Water bottle", "essentials");

  const days = Math.max(
    1,
    Math.min(
      7,
      Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1,
    ),
  );
  for (let day = 1; day <= days; day += 1) {
    add(`Clothes set, day ${day}`, "clothing");
  }

  if (weather?.source === "forecast") {
    if (weather.minTemperatureC !== null && weather.minTemperatureC < 15) {
      add("Warm jacket", "weather", `Forecast low ${weather.minTemperatureC} °C.`);
      add("Thermal wear", "weather", `Forecast low ${weather.minTemperatureC} °C.`);
    }
    if (weather.maxTemperatureC !== null && weather.maxTemperatureC > 32) {
      add("Sunscreen", "weather", `Forecast high ${weather.maxTemperatureC} °C.`);
      add("Light cotton clothes", "weather", `Forecast high ${weather.maxTemperatureC} °C.`);
    }
    if (weather.rainChance !== null && weather.rainChance >= 40) {
      add("Umbrella or raincoat", "weather", `Rain chance up to ${weather.rainChance}%.`);
    }
  } else {
    const destination = trip.destination.toLowerCase();
    const month = new Date(trip.startDate).getMonth();
    const hillStation = hillStationNames.some((name) => destination.includes(name));
    if (hillStation || month === 11 || month === 0) {
      add("Warm jacket", "weather", "Seasonal estimate, not a forecast.");
    }
  }

  const nightTrain = segments.some((segment) => {
    if (!segment.departure) return false;
    return new Date(segment.departure).getHours() >= 20;
  });
  if (nightTrain) {
    add("Night-travel kit (blanket, earplugs)", "essentials", "Overnight train.");
  }

  return result;
}

const suggestionSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().trim().min(1).max(60),
      category: z.enum(PACKING_CATEGORIES),
      reason: z.string().trim().max(160),
    }).passthrough(),
  ).max(6),
}).passthrough();

export async function suggestExtraPackingItems(input: {
  destination: string;
  days: number;
  purpose: string;
  weather: TripWeather | null;
}): Promise<{ items: PackingSuggestion[]; aiAvailable: boolean }> {
  if (!env.GEMINI_API_KEY) return { items: [], aiAvailable: false };

  try {
    const response = await generateWithGemini("packing suggestions", (client) =>
      client.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: [{
          role: "user",
          parts: [{
            text: `Suggest up to 6 extra train-trip packing items, with no duplicates of ordinary essentials. Return JSON only in this shape: {"items":[{"name":"string","category":"clothing|toiletries|electronics|documents|essentials|weather|custom","reason":"string"}]}. Trip: ${JSON.stringify(input)}.`,
          }],
        }],
        config: { responseMimeType: "application/json" },
      }),
    );

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(response.text ?? "");
    } catch {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        provider: "gemini",
        operation: "packing suggestions",
        status: "invalid_json",
      }));
      return { items: [], aiAvailable: false };
    }
    const parsed = suggestionSchema.safeParse(parsedJson);
    if (!parsed.success) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        provider: "gemini",
        operation: "packing suggestions",
        status: "invalid_response",
      }));
      return { items: [], aiAvailable: false };
    }
    return {
      items: parsed.data.items.map((item) => ({
        ...item,
        source: "ai" as const,
        isPacked: false,
      })),
      aiAvailable: true,
    };
  } catch (error) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      provider: "gemini",
      operation: "packing suggestions",
      status: getGeminiStatus(error) ?? "error",
    }));
    return { items: [], aiAvailable: false };
  }
}
