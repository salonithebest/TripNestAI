import { AppError } from "./AppError";

export function validateDeparture(departure: Date | string | undefined, tripStart: Date, tripEnd: Date): void {
  if (!departure) return;

  const departureDay =
    typeof departure === "string" ? departure : departure.toISOString().slice(0, 10);
  if (typeof departure === "string") {
    const [year, month, day] = departure.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      throw new AppError(400, "Departure date must be a real calendar date.");
    }
  }
  const startDay = new Date(tripStart).toISOString().slice(0, 10);
  const endDay = new Date(tripEnd).toISOString().slice(0, 10);

  if (departureDay < startDay || departureDay > endDay) {
    throw new AppError(400, "Departure must be between the trip dates.");
  }
}
