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
router.use("/trips", documentRoutes);
router.use("/trips", packingRoutes);
router.use("/trips", readinessRoutes);
router.use("/segments", segmentRoutes);
router.use("/documents", documentRoutes);
router.use("/packing", packingRoutes);
router.use("/readiness", readinessRoutes);

export default router;
