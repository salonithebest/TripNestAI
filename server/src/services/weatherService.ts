const WEATHER_CACHE_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_FORECAST_DAYS = 16;

export type TripWeather = {
  minTemperatureC: number | null;
  maxTemperatureC: number | null;
  rainChance: number | null;
  source: "forecast" | "seasonal";
  label: "Forecast" | "Seasonal estimate";
};

type GeocodeResult = {
  results?: Array<{ latitude?: number; longitude?: number; name?: string }>;
};

type ForecastResult = {
  daily?: {
    time?: string[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    precipitation_probability_max?: number[];
  };
};

type WeatherTrip = {
  destination: string;
  startDate: Date;
  endDate: Date;
  weather?: TripWeather | null;
  latitude?: number | null;
  longitude?: number | null;
  forecastAvailable: boolean;
  weatherUpdatedAt?: Date | null;
  save(): Promise<unknown>;
};

type FetchResult<T> = {
  data: T | null;
  status: number | null;
  failure?: "http" | "timeout" | "network";
};

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function logWeatherFailure(
  step: "geocoding" | "forecast",
  result: FetchResult<unknown>,
  detail = "",
): void {
  const reason =
    result.failure === "timeout"
      ? "timeout"
      : result.failure === "network"
        ? "network error"
        : "request failed";
  console.warn(
    `[weather] ${step} ${reason}; HTTP status: ${result.status ?? "unavailable"}${detail ? `; ${detail}` : ""}`,
  );
}

function minValue(values: number[] | undefined): number | null {
  const numericValues = values?.filter((value) => Number.isFinite(value)) ?? [];
  return numericValues.length ? Math.round(Math.min(...numericValues)) : null;
}

function maxValue(values: number[] | undefined): number | null {
  const numericValues = values?.filter((value) => Number.isFinite(value)) ?? [];
  return numericValues.length ? Math.round(Math.max(...numericValues)) : null;
}

async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) return { data: null, status: response.status, failure: "http" };
    return { data: (await response.json()) as T, status: response.status };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return {
      data: null,
      status: null,
      failure: name === "TimeoutError" || name === "AbortError" ? "timeout" : "network",
    };
  }
}

export async function getTripWeather(
  trip: WeatherTrip,
  now = new Date(),
): Promise<{ weather: TripWeather | null; forecastAvailable: boolean }> {
  const cacheTime = trip.weatherUpdatedAt?.getTime();
  const cachedWeatherIsComplete =
    trip.weather &&
    trip.weather.minTemperatureC !== null &&
    trip.weather.maxTemperatureC !== null &&
    trip.weather.rainChance !== null;
  if (cachedWeatherIsComplete && cacheTime && now.getTime() - cacheTime < WEATHER_CACHE_MS) {
    return {
      weather: trip.weather as TripWeather,
      forecastAvailable: trip.forecastAvailable,
    };
  }

  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.search = new URLSearchParams({
    name: trip.destination.trim(),
    count: "1",
    language: "en",
    format: "json",
  }).toString();
  const geocodeResult = await fetchJson<GeocodeResult>(geocodeUrl.toString());
  const geocode = geocodeResult.data;
  const destination = geocode?.results?.[0];
  if (typeof destination?.latitude !== "number" || typeof destination.longitude !== "number") {
    logWeatherFailure(
      "geocoding",
      geocodeResult,
      geocodeResult.data ? "no coordinates returned" : "",
    );
    trip.weather = null;
    trip.latitude = null;
    trip.longitude = null;
    trip.forecastAvailable = false;
    trip.weatherUpdatedAt = now;
    await trip.save();
    return { weather: null, forecastAvailable: false };
  }

  trip.latitude = destination.latitude;
  trip.longitude = destination.longitude;

  const tripStart = new Date(trip.startDate);
  const daysUntilStart = Math.floor(
    (Date.UTC(tripStart.getUTCFullYear(), tripStart.getUTCMonth(), tripStart.getUTCDate()) -
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) /
      86_400_000,
  );
  if (daysUntilStart < 0) {
    trip.weather = null;
    trip.forecastAvailable = false;
    trip.weatherUpdatedAt = now;
    await trip.save();
    return { weather: null, forecastAvailable: false };
  }

  if (daysUntilStart > MAX_FORECAST_DAYS) {
    const seasonalWeather: TripWeather = {
      minTemperatureC: null,
      maxTemperatureC: null,
      rainChance: null,
      source: "seasonal",
      label: "Seasonal estimate",
    };
    trip.weather = seasonalWeather;
    trip.forecastAvailable = false;
    trip.weatherUpdatedAt = now;
    await trip.save();
    return { weather: seasonalWeather, forecastAvailable: false };
  }
  if (daysUntilStart >= MAX_FORECAST_DAYS) {
    logWeatherFailure("forecast", { data: null, status: null, failure: "http" }, "trip starts outside the provider forecast window");
    trip.weather = null;
    trip.forecastAvailable = false;
    trip.weatherUpdatedAt = now;
    await trip.save();
    return { weather: null, forecastAvailable: false };
  }

  const tripEnd = new Date(trip.endDate);
  const lastForecastDay = new Date(now);
  lastForecastDay.setUTCHours(0, 0, 0, 0);
  lastForecastDay.setUTCDate(lastForecastDay.getUTCDate() + MAX_FORECAST_DAYS - 1);
  const forecastEnd = new Date(
    Math.min(
      Date.UTC(tripEnd.getUTCFullYear(), tripEnd.getUTCMonth(), tripEnd.getUTCDate()),
      Date.UTC(lastForecastDay.getUTCFullYear(), lastForecastDay.getUTCMonth(), lastForecastDay.getUTCDate()),
    ),
  );
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.search = new URLSearchParams({
    latitude: String(destination.latitude),
    longitude: String(destination.longitude),
    daily: "temperature_2m_min,temperature_2m_max,precipitation_probability_max",
    timezone: "auto",
    start_date: dateString(tripStart),
    end_date: dateString(forecastEnd),
  }).toString();
  const forecastResult = await fetchJson<ForecastResult>(forecastUrl.toString());
  const forecast = forecastResult.data;
  const daily = forecast?.daily;
  const minTemperatureC = minValue(daily?.temperature_2m_min);
  const maxTemperatureC = maxValue(daily?.temperature_2m_max);
  const rainChance = maxValue(daily?.precipitation_probability_max);

  if (minTemperatureC === null || maxTemperatureC === null || rainChance === null) {
    logWeatherFailure(
      "forecast",
      forecastResult,
      forecastResult.data ? "forecast response contained no daily values" : "",
    );
    trip.weather = null;
    trip.forecastAvailable = false;
    trip.weatherUpdatedAt = now;
    await trip.save();
    return { weather: null, forecastAvailable: false };
  }

  const weather: TripWeather = {
    minTemperatureC,
    maxTemperatureC,
    rainChance,
    source: "forecast",
    label: "Forecast",
  };
  trip.weather = weather;
  trip.forecastAvailable = true;
  trip.weatherUpdatedAt = now;
  await trip.save();
  return { weather, forecastAvailable: true };
}
