import { Router } from "express";
import authRoutes from "./authRoutes";
import segmentRoutes from "./segmentRoutes";
import tripRoutes from "./tripRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/trips", tripRoutes);
router.use("/segments", segmentRoutes);

export default router;
