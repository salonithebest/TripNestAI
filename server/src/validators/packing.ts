import { z } from "zod";
import { PACKING_CATEGORIES } from "../constants";

export const customPackingItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(100),
  category: z.enum(PACKING_CATEGORIES, { message: "Choose a valid packing category" }),
  reason: z.string().trim().max(160).optional(),
});
