import { z } from "zod";
import { PACKING_CATEGORIES } from "../constants";

export const customPackingItemSchema = z.object({
  title: z.string().trim().min(1, "Item title is required").max(120),
  category: z.enum(PACKING_CATEGORIES, { message: "Choose a valid packing category" }),
  notes: z.string().trim().max(500).optional(),
  quantity: z.coerce.number().int().min(1).max(100).optional(),
  essential: z.boolean().optional(),
});
