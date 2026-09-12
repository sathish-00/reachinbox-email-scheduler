import { Request, Response } from "express";
import {
  createEmailBatch,
  getScheduledEmails,
  getSentEmails,
} from "../services/email.service";
import { ScheduleEmailInput } from "../types/email.types";
import { AuthUser } from "../types/auth.types";
import { searchEmailJobs } from "../services/elasticsearch.service";

export const createEmailBatchController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as AuthUser | undefined)?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const data = req.body as ScheduleEmailInput;

    const batch = await createEmailBatch(userId, data);

    res.status(201).json({
      success: true,
      message: "Email batch scheduled successfully",
      data: batch,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to schedule emails";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const getScheduledEmailsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as AuthUser | undefined)?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const emails = await getScheduledEmails(userId);

    res.json({
      success: true,
      data: emails,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch scheduled emails",
    });
  }
};

export const getSentEmailsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as AuthUser | undefined)?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const emails = await getSentEmails(userId);

    res.json({
      success: true,
      data: emails,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sent emails",
    });
  }
};

export const searchEmailJobsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req.user as AuthUser | undefined)?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const query =
      typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";

    if (!query) {
      res.status(400).json({
        success: false,
        message: "Search query is required",
      });
      return;
    }

    const results = await searchEmailJobs(
      userId,
      query
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error(
      "Elasticsearch search failed:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to search email jobs",
    });
  }
};