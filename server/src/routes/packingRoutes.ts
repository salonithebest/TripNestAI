import { Router } from "express";
import { addCustomItem, deletePackingItem, generatePackingList, listPackingItems, togglePacked } from "../controllers/packingController";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { customPackingItemSchema } from "../validators/packing";

const router = Router();

router.use(requireAuth);

router.route("/trips/:tripId/packing").get(listPackingItems).post(validate(customPackingItemSchema), addCustomItem);
router.route("/:tripId/packing").get(listPackingItems).post(validate(customPackingItemSchema), addCustomItem);
router.route("/trips/:tripId/packing/generate").post(generatePackingList);
router.route("/:tripId/packing/generate").post(generatePackingList);
router.route("/packing/:itemId/toggle").patch(togglePacked);
router.route("/packing/:itemId").delete(deletePackingItem);
router.route("/:itemId/toggle").patch(togglePacked);
router.route("/:itemId").delete(deletePackingItem);

export default router;
