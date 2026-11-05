import { Router } from "express";
import authRoutes from "./authRoutes";
import documentRoutes from "./documentRoutes";
import packingRoutes from "./packingRoutes";
import readinessRoutes from "./readinessRoutes";
import segmentRoutes from "./segmentRoutes";
import tripRoutes from "./tripRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/trips", tripRoutes);
router.use("/segments", segmentRoutes);
router.use("/", documentRoutes);
router.use("/", packingRoutes);
router.use("/", readinessRoutes);

export default router;
