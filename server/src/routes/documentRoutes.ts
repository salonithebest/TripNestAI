import { Router } from "express";
import { createDocument, deleteDocument, listDocuments, reviewDocument, uploadDocumentMiddleware } from "../controllers/documentController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.route("/trips/:tripId/documents").get(listDocuments).post(uploadDocumentMiddleware, createDocument);
router.route("/:tripId/documents").get(listDocuments).post(uploadDocumentMiddleware, createDocument);
router.route("/documents/:documentId").patch(reviewDocument).delete(deleteDocument);
router.route("/:documentId").patch(reviewDocument).delete(deleteDocument);

export default router;
