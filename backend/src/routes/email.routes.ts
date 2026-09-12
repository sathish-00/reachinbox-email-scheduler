import { Router } from "express";
import {
  createEmailBatchController,
  getScheduledEmailsController,
  getSentEmailsController,
  searchEmailJobsController,
} from "../controllers/email.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/schedule",
  requireAuth,
  createEmailBatchController
);

router.get(
  "/scheduled",
  requireAuth,
  getScheduledEmailsController
);

router.get(
  "/sent",
  requireAuth,
  getSentEmailsController
);

router.get(
  "/search",
  requireAuth,
  searchEmailJobsController
);

export default router;