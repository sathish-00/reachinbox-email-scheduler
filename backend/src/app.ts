import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./config/passport";
import { redisSessionStore } from "./config/session-store";

import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";

import { emailQueue } from "./queues/email.queue";

import authRoutes from "./routes/auth.routes";
import senderRoutes from "./routes/sender.routes";
import emailRoutes from "./routes/email.routes";
import slackRoutes from "./routes/slack.routes";

const app = express();

// Render runs the application behind a proxy.
// This is required for secure production session cookies.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Bull Board
const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

// CORS
app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:3000",
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redis-backed Session
app.use(
  session({
    store: redisSessionStore,
    secret:
      process.env.SESSION_SECRET ||
      "reachinbox-development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/senders", senderRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/slack", slackRoutes);

// Bull Board dashboard
app.use(
  "/admin/queues",
  serverAdapter.getRouter()
);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "ReachInbox backend is running",
  });
});

export default app;