import { Router } from "express";
import { createDocument, createManualDocument, deleteDocument, listDocuments, reviewDocument, uploadDocumentMiddleware } from "../controllers/documentController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.route("/trips/:tripId/documents").get(listDocuments).post(uploadDocumentMiddleware, createDocument);
router.route("/trips/:tripId/documents/manual").post(createManualDocument);
router.route("/documents/:documentId/review").patch(reviewDocument);
router.route("/documents/:documentId").delete(deleteDocument);

export default router;
