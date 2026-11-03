import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { assertTripOwner, assertValidId } from "../utils/ownership";
import { routeParam } from "../utils/routeParam";
import { PackingItem } from "../models/PackingItem";
import { generatePackingPlan } from "../services/packingRules";
import { getWeatherSummary } from "../services/weatherService";

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, "Not authorized. Please log in.");
  }
  return req.userId;
}

async function findOwnedPackingItem(itemId: string, userId: string) {
  assertValidId(itemId, "item id");
  const item = await PackingItem.findById(itemId);
  if (!item) {
    throw new AppError(404, "Packing item not found");
  }
  await assertTripOwner(String(item.tripId), userId);
  return item;
}

export async function listPackingItems(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  await assertTripOwner(tripId, getUserId(req));
  const items = await PackingItem.find({ tripId }).sort({ essential: -1, category: 1, title: 1 });
  res.json({ items });
}

export async function addCustomItem(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  await assertTripOwner(tripId, getUserId(req));
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  if (!title) {
    throw new AppError(400, "Item title is required");
  }

  const item = await PackingItem.create({
    userId: getUserId(req),
    tripId,
    title,
    category: typeof req.body.category === "string" ? req.body.category : "Custom",
    notes: typeof req.body.notes === "string" ? req.body.notes : "",
    quantity: Number(req.body.quantity ?? 1),
    essential: Boolean(req.body.essential),
    packed: Boolean(req.body.packed),
    source: "manual",
  });

  res.status(201).json({ item });
}

export async function generatePackingList(req: Request, res: Response) {
  const tripId = routeParam(req.params.tripId, "trip id");
  const trip = await assertTripOwner(tripId, getUserId(req));
  const weatherSummary = await getWeatherSummary(trip.destination, trip.startDate);

  const plan = generatePackingPlan({
    trip: {
      title: trip.title,
      destination: trip.destination,
      origin: trip.origin,
      purpose: trip.purpose,
      startDate: trip.startDate,
      endDate: trip.endDate,
    },
    weatherSummary: weatherSummary ?? undefined,
  });

  await PackingItem.deleteMany({ tripId, userId: getUserId(req), source: "ai" });
  const generatedItems = await PackingItem.insertMany(
    plan.items.map((item) => ({
      userId: getUserId(req),
      tripId,
      title: item.title,
      category: item.category,
      quantity: item.quantity,
      essential: item.essential,
      packed: false,
      notes: item.notes ?? "",
      source: "ai",
    })),
  );

  res.status(201).json({ items: generatedItems, summary: plan.summary, readinessHints: plan.readinessHints });
}

export async function togglePacked(req: Request, res: Response) {
  const item = await findOwnedPackingItem(routeParam(req.params.itemId, "item id"), getUserId(req));
  item.packed = !item.packed;
  await item.save();
  res.json({ item });
}

export async function deletePackingItem(req: Request, res: Response) {
  const item = await findOwnedPackingItem(routeParam(req.params.itemId, "item id"), getUserId(req));
  await item.deleteOne();
  res.json({ message: "Packing item deleted" });
}
