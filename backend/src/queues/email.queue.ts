import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { EmailJobData } from "../types/email.types";

export const EMAIL_QUEUE_NAME = "email-scheduler";

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});