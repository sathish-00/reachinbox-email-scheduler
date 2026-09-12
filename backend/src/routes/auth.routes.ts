import { Router } from "express";
import passport from "passport";
import {
  googleCallbackController,
  getCurrentUserController,
  logoutController,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:3000/login?error=google_auth_failed",
  }),
  googleCallbackController
);

router.get("/me", requireAuth, getCurrentUserController);

router.post("/logout", requireAuth, logoutController);

export default router;