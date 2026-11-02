import { Router } from "express";
import { createSegment, listSegments } from "../controllers/segmentController";
import { createTrip, deleteTrip, getTrip, listTrips, updateTrip } from "../controllers/tripController";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { segmentInputSchema } from "../validators/segment";
import { createTripSchema, updateTripSchema } from "../validators/trip";

const router = Router();

router.use(requireAuth);

router.route("/").get(listTrips).post(validate(createTripSchema), createTrip);
router.route("/:tripId").get(getTrip).put(validate(updateTripSchema), updateTrip).delete(deleteTrip);
router.route("/:tripId/segments").get(listSegments).post(validate(segmentInputSchema), createSegment);

export default router;
