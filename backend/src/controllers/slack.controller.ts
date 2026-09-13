import { Request, Response } from "express";
import crypto from "crypto";
import {
  exchangeSlackCode,
  getSlackAuthorizationUrl,
  getSlackConnection,
  saveSlackConnection,
} from "../services/slack.service";
import { AuthUser } from "../types/auth.types";

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:3000";

export const connectSlackController = (
  req: Request,
  res: Response
): void => {
  const userId = (req.user as AuthUser | undefined)?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const state = crypto.randomBytes(32).toString("hex");

  req.session.slackOAuthState = state;
  req.session.slackOAuthUserId = userId;

  const authorizationUrl = getSlackAuthorizationUrl(state);

  res.redirect(authorizationUrl);
};

export const slackCallbackController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      res.redirect(
        `${FRONTEND_URL}/dashboard?slack=cancelled`
      );
      return;
    }

    if (typeof code !== "string" || typeof state !== "string") {
      res.redirect(
        `${FRONTEND_URL}/dashboard?slack=failed`
      );
      return;
    }

    const savedState = req.session.slackOAuthState;
    const userId = req.session.slackOAuthUserId;

    if (!savedState || !userId || state !== savedState) {
      res.redirect(
        `${FRONTEND_URL}/dashboard?slack=failed`
      );
      return;
    }

    const slackData = await exchangeSlackCode(code);

    await saveSlackConnection(userId, slackData);

    delete req.session.slackOAuthState;
    delete req.session.slackOAuthUserId;

    res.redirect(
      `${FRONTEND_URL}/dashboard?slack=connected`
    );
  } catch (error) {
    console.error("Slack OAuth callback failed:", error);

    res.redirect(
      `${FRONTEND_URL}/dashboard?slack=failed`
    );
  }
};

export const getSlackConnectionController = async (
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

    const connection = await getSlackConnection(userId);

    if (!connection) {
      res.status(200).json({
        success: true,
        connected: false,
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      connected: true,
      data: {
        teamId: connection.teamId,
        teamName: connection.teamName,
        webhookConnected: Boolean(connection.webhookUrl),
      },
    });
  } catch (error) {
    console.error("Failed to fetch Slack connection:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch Slack connection",
    });
  }
};