import { Router } from "express";
import { addCustomItem, deletePackingItem, generatePackingList, listPackingItems, togglePacked } from "../controllers/packingController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.route("/trips/:tripId/packing").get(listPackingItems).post(addCustomItem);
router.route("/:tripId/packing").get(listPackingItems).post(addCustomItem);
router.route("/trips/:tripId/packing/generate").post(generatePackingList);
router.route("/:tripId/packing/generate").post(generatePackingList);
router.route("/packing/:itemId/toggle").patch(togglePacked);
router.route("/packing/:itemId").delete(deletePackingItem);
router.route("/:itemId/toggle").patch(togglePacked);
router.route("/:itemId").delete(deletePackingItem);

export default router;
