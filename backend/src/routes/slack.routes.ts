import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  connectSlackController,
  slackCallbackController,
  getSlackConnectionController,
} from "../controllers/slack.controller";

const router = Router();

router.get("/connect", requireAuth, connectSlackController);

router.get("/callback", slackCallbackController);

router.get("/connection", requireAuth, getSlackConnectionController);

export default router;