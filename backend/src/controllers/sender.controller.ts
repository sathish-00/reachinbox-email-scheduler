import { Request, Response } from "express";
import { AuthUser } from "../types/auth.types";
import {
  createSender,
  getSenders,
} from "../services/sender.service";

export const createSenderController = async (
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

    const { email, displayName } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Sender email is required",
      });
      return;
    }

    const sender = await createSender(
      userId,
      email,
      displayName
    );

    res.status(201).json({
      success: true,
      message: "Sender created successfully",
      data: sender,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create sender";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const getSendersController = async (
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

    const senders = await getSenders(userId);

    res.status(200).json({
      success: true,
      data: senders,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch senders",
    });
  }
};