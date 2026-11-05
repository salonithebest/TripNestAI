import { Router } from "express";
import { exportCalendar, getReadiness, getWeather } from "../controllers/readinessController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.route("/trips/:tripId/readiness").get(getReadiness);
router.route("/trips/:tripId/weather").get(getWeather);
router.route("/trips/:tripId/calendar.ics").get(exportCalendar);

export default router;
