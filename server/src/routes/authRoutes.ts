import { Router } from "express";
import { login, me, register } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../validators/auth";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", requireAuth, me);

export default router;
