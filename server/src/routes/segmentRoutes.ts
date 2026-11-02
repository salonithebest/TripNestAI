import { Router } from "express";
import { deleteSegment, updateSegment } from "../controllers/segmentController";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateSegmentSchema } from "../validators/segment";

const router = Router();

router.use(requireAuth);
router.route("/:segmentId").put(validate(updateSegmentSchema), updateSegment).delete(deleteSegment);

export default router;
