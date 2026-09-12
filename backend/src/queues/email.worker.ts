import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma } from "../config/database";
import {
  EMAIL_QUEUE_NAME,
  emailQueue,
} from "./email.queue";
import { EmailJobData } from "../types/email.types";
import { sendEmail } from "../services/smtp.service";
import {
  checkAndReserveRateLimit,
} from "../services/rate-limit.service";
import {
  updateEmailJobIndex,
} from "../services/elasticsearch.service";
import {
  notifySlackRateLimit,
} from "../services/slack-notification.service";

const concurrency = Number(
  process.env.WORKER_CONCURRENCY || 5
);

const processEmailJob = async (
  job: Job<EmailJobData>
): Promise<void> => {
  const {
    jobId,
    senderId,
    recipient,
    subject,
    body,
  } = job.data;

  const emailJob = await prisma.emailJob.findUnique({
    where: {
      id: jobId,
    },
    include: {
      batch: true,
      sender: true,
    },
  });

  if (!emailJob) {
    console.log(
      `Email job ${jobId} no longer exists`
    );
    return;
  }

  // Idempotency guard
  const claimed = await prisma.emailJob.updateMany({
    where: {
      id: jobId,
      status: "SCHEDULED",
    },
    data: {
      status: "PROCESSING",
    },
  });

  if (claimed.count === 0) {
    console.log(
      `Skipping ${jobId}: already processed or being processed`
    );
    return;
  }

  try {
    const rateLimit = await checkAndReserveRateLimit(
      senderId,
      emailJob.batch.hourlyLimit,
      emailJob.batch.delaySeconds
    );

    if (!rateLimit.allowed) {
      /*
       * Notify Slack only once for this sender's
       * current hourly rate-limit window.
       */
      if (rateLimit.shouldNotifySlack) {
        await notifySlackRateLimit(
          emailJob.batch.userId,
          {
            senderId,
            hourlyLimit:
              emailJob.batch.hourlyLimit,
            count: rateLimit.count,
            retryAt: rateLimit.retryAt,
          }
        );
      }

      await prisma.emailJob.update({
        where: {
          id: jobId,
        },
        data: {
          status: "SCHEDULED",
          scheduledAt: rateLimit.retryAt,
        },
      });

      const delay = Math.max(
        1000,
        rateLimit.retryAt.getTime() - Date.now()
      );

      /*
       * Requeue the job without calling job.remove().
       *
       * BullMQ jobs are locked while being processed,
       * so removing the active job causes a lock error.
       */
      await emailQueue.add(
        "send-email",
        job.data,
        {
          jobId,
          delay,
        }
      );

      console.log(
        `Rate limit reached for sender ${senderId}. ` +
          `Email ${jobId} rescheduled for ` +
          `${rateLimit.retryAt.toISOString()}`
      );

      return;
    }

    // Wait for the globally reserved sending slot.
    const waitMs = Math.max(
      0,
      rateLimit.scheduledAt.getTime() - Date.now()
    );

    if (waitMs > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, waitMs);
      });
    }

    const from = emailJob.sender.displayName
      ? `"${emailJob.sender.displayName}" <${emailJob.sender.email}>`
      : emailJob.sender.email;

    const result = await sendEmail(
      from,
      recipient,
      subject,
      body
    );

    const sentAt = new Date();

    /*
     * IMPORTANT:
     * PostgreSQL is the source of truth.
     *
     * Mark the email SENT immediately after SMTP succeeds.
     * Elasticsearch failure must never change a successful
     * email into FAILED.
     */
    await prisma.emailJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: "SENT",
        sentAt,
        error: null,
      },
    });

    /*
     * Elasticsearch is a secondary index.
     *
     * If indexing fails, log the error but do NOT throw.
     */
    try {
      await updateEmailJobIndex(jobId, {
        status: "SENT",
        sentAt,
        error: null,
        updatedAt: new Date(),
      });
    } catch (indexError) {
      console.error(
        `Elasticsearch update failed for sent email ${jobId}:`,
        indexError
      );
    }

    console.log(
      `Email sent successfully: ${recipient}`
    );

    if (result.previewUrl) {
      console.log(
        `Ethereal preview: ${result.previewUrl}`
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown email sending error";

    const failedAt = new Date();

    /*
     * Only SMTP/processing failures reach this block.
     * Elasticsearch errors after a successful send are
     * handled separately above.
     */
    await prisma.emailJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: "FAILED",
        failedAt,
        error: message,
      },
    });

    /*
     * Elasticsearch failure must not hide the real
     * email failure or cause another worker error.
     */
    try {
      await updateEmailJobIndex(jobId, {
        status: "FAILED",
        failedAt,
        error: message,
        updatedAt: new Date(),
      });
    } catch (indexError) {
      console.error(
        `Elasticsearch update failed for failed email ${jobId}:`,
        indexError
      );
    }

    console.error(
      `Failed to send email ${jobId}:`,
      message
    );

    throw error;
  }
};

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  processEmailJob,
  {
    connection: redisConnection,
    concurrency,
  }
);

emailWorker.on("ready", () => {
  console.log(
    `Email worker ready with concurrency: ${concurrency}`
  );
});

emailWorker.on("completed", (job) => {
  console.log(
    `BullMQ job completed: ${job.id}`
  );
});

emailWorker.on("failed", (job, error) => {
  console.error(
    `BullMQ job failed: ${job?.id}`,
    error.message
  );
});

emailWorker.on("error", (error) => {
  console.error(
    "Email worker error:",
    error
  );
});

const shutdown = async (
  signal: string
): Promise<void> => {
  console.log(
    `${signal} received. Closing email worker...`
  );

  await emailWorker.close();
  await prisma.$disconnect();
  await redisConnection.quit();

  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});