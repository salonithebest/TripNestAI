import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { assertTripOwner, assertValidId } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";
import { PackingItem } from "../models/PackingItem";
import { JourneySegment } from "../models/JourneySegment";
import { generatePackingRules, suggestExtraPackingItems } from "../services/packingRules";
import { getTripWeather } from "../services/weatherService";

function getUserId(req: Request): string {
  if (!req.userId) throw new AppError(401, "Not authorized. Please log in.");
  return req.userId;
}

function groupItems<T extends { category: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    (groups[item.category] ??= []).push(item);
    return groups;
  }, {});
}

async function findOwnedPackingItem(itemId: string, userId: string) {
  assertValidId(itemId, "packing item id");
  const item = await PackingItem.findOne({ _id: itemId, userId });
  if (!item) throw new AppError(404, "Packing item not found");
  await assertTripOwner(String(item.tripId), userId);
  return item;
}

export async function listPackingItems(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  await assertTripOwner(tripId, getUserId(req));
  const items = await PackingItem.find({ tripId, userId: getUserId(req) })
    .sort({ category: 1, name: 1 })
    .lean();
  const groupedItems = groupItems(items);
  res.json({ items, groupedItems });
}

export async function addCustomItem(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  await assertTripOwner(tripId, getUserId(req));
  const item = await PackingItem.create({
    userId: getUserId(req),
    tripId,
    name: req.body.name,
    category: req.body.category,
    reason: req.body.reason ?? "",
    source: "user",
  });
  res.status(201).json({ item });
}

export async function generatePackingList(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));
  const [weatherResult, segments] = await Promise.all([
    getTripWeather(trip),
    JourneySegment.find({ tripId, transportMode: "train" }).select("departure").lean(),
  ]);
  const ruleItems = generatePackingRules(trip, weatherResult.weather, segments);
  const dayCount = Math.max(
    1,
    Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1,
  );
  const aiResult = await suggestExtraPackingItems({
    destination: trip.destination,
    days: dayCount,
    purpose: trip.purpose,
    weather: weatherResult.weather,
  });
  const generated = [...ruleItems, ...aiResult.items];

  const existingItems = await PackingItem.find({ tripId, userId: getUserId(req) }).lean();
  const packedByName = new Map(
    existingItems.map((item) => [item.name.toLocaleLowerCase(), item.isPacked]),
  );

  await PackingItem.deleteMany({ tripId, userId: getUserId(req), source: { $in: ["rule", "ai"] } });
  const items = await PackingItem.insertMany(
    generated.map((item) => ({
      ...item,
      userId: getUserId(req),
      tripId,
      isPacked: packedByName.get(item.name.toLocaleLowerCase()) ?? false,
    })),
  );
  res.status(201).json({
    items,
    groupedItems: groupItems(items),
    aiAvailable: aiResult.aiAvailable,
    weather: weatherResult.weather,
    forecastAvailable: weatherResult.forecastAvailable,
  });
}

export async function togglePacked(req: Request, res: Response) {
  const item = await findOwnedPackingItem(routeParam(req.params.itemId, "packing item id"), getUserId(req));
  item.isPacked = !item.isPacked;
  await item.save();
  res.json({ item });
}

export async function deletePackingItem(req: Request, res: Response) {
  const item = await findOwnedPackingItem(routeParam(req.params.itemId, "packing item id"), getUserId(req));
  await item.deleteOne();
  res.json({ message: "Packing item deleted" });
}
