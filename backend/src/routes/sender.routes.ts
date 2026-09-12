import { Router } from "express";
import {
  createSenderController,
  getSendersController,
} from "../controllers/sender.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/", requireAuth, createSenderController);

router.get("/", requireAuth, getSendersController);

export default router;