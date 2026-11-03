export type WeatherSummary = {
  location: string;
  date: string;
  temperatureC: number;
  precipitationChance: number;
  summary: string;
};

export async function getWeatherSummary(location: string, date: Date | string): Promise<WeatherSummary | null> {
  const trimmedLocation = location?.trim();
  if (!trimmedLocation) return null;

  try {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedLocation)}&count=1&language=en&format=json`;
    const geocodeResponse = await fetch(geocodeUrl);
    if (!geocodeResponse.ok) return null;

    const geocodeData = (await geocodeResponse.json()) as {
      results?: Array<{ name?: string; latitude?: number; longitude?: number }>;
    };

    const result = geocodeData.results?.[0];
    if (!result || typeof result.latitude !== "number" || typeof result.longitude !== "number") return null;

    const targetDate = new Date(date);
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);

    const params = new URLSearchParams({
      latitude: String(result.latitude),
      longitude: String(result.longitude),
      daily: "temperature_2m_max,precipitation_probability_max",
      timezone: "auto",
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    });

    const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!forecastResponse.ok) return null;

    const forecastData = (await forecastResponse.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        precipitation_probability_max?: number[];
      };
    };

    const dayIndex = 0;
    const temp = forecastData.daily?.temperature_2m_max?.[dayIndex] ?? 23;
    const rainChance = forecastData.daily?.precipitation_probability_max?.[dayIndex] ?? 25;
    const summaryText = temp >= 28 ? "Warm and sunny" : temp <= 12 ? "Cool and crisp" : rainChance >= 40 ? "Mild with showers" : "Comfortable travel weather";

    return {
      location: result.name ?? trimmedLocation,
      date: forecastData.daily?.time?.[dayIndex] ?? new Date(date).toISOString().slice(0, 10),
      temperatureC: Math.round(temp),
      precipitationChance: Math.round(rainChance),
      summary: summaryText,
    };
  } catch {
    return null;
  }
}
