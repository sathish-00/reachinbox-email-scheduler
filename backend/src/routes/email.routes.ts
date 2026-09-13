import { Router, Request, Response } from "express";

import {
  createEmailBatchController,
  getScheduledEmailsController,
  getSentEmailsController,
  searchEmailJobsController,
} from "../controllers/email.controller";

import { requireAuth } from "../middleware/auth.middleware";
import { prisma } from "../config/database";

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

/**
 * GET /api/emails/stats
 * Returns live email counts directly from PostgreSQL.
 */
router.get(
  "/stats",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as { id: string }).id;

      const [scheduled, processing, sent, failed] =
        await Promise.all([
          prisma.emailJob.count({
            where: {
              batch: {
                userId,
              },
              status: "SCHEDULED",
            },
          }),

          prisma.emailJob.count({
            where: {
              batch: {
                userId,
              },
              status: "PROCESSING",
            },
          }),

          prisma.emailJob.count({
            where: {
              batch: {
                userId,
              },
              status: "SENT",
            },
          }),

          prisma.emailJob.count({
            where: {
              batch: {
                userId,
              },
              status: "FAILED",
            },
          }),
        ]);

      return res.json({
        success: true,
        stats: {
          scheduled,
          processing,
          sent,
          failed,
          total:
            scheduled +
            processing +
            sent +
            failed,
        },
      });
    } catch (error) {
      console.error(
        "Failed to fetch email stats:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch email statistics",
      });
    }
  }
);

export default router;