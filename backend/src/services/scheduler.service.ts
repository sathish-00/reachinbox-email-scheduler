import { emailQueue } from "../queues/email.queue";
import { prisma } from "../config/database";
import { ScheduleEmailInput } from "../types/email.types";
import { indexEmailJobsBulk } from "./elasticsearch.service";
import crypto from "crypto";

export const scheduleEmailBatch = async (
  userId: string,
  data: ScheduleEmailInput
) => {
  const startTime = new Date(data.startTime);

  const sender = await prisma.sender.findFirst({
    where: {
      id: data.senderId,
      userId,
      active: true,
    },
  });

  if (!sender) {
    throw new Error("Sender not found or inactive");
  }

  if (data.recipients.length === 0) {
    throw new Error("At least one recipient is required");
  }

  if (data.delaySeconds < 0) {
    throw new Error("Delay cannot be negative");
  }

  if (data.hourlyLimit <= 0) {
    throw new Error("Hourly limit must be greater than zero");
  }

  /*
   * Create the email batch first.
   */
  const batch = await prisma.emailBatch.create({
    data: {
      subject: data.subject,
      body: data.body,
      startTime,
      delaySeconds: data.delaySeconds,
      hourlyLimit: data.hourlyLimit,
      userId,
      senderId: sender.id,
    },
  });

  /*
   * Generate all EmailJob IDs before inserting.
   *
   * The same ID is used for:
   *
   * PostgreSQL EmailJob.id
   *        +
   * BullMQ jobId
   *
   * This provides a deterministic relationship
   * between the database record and BullMQ job.
   */
  const emailJobs = data.recipients.map(
    (recipient, index) => {
      const id = crypto.randomUUID();

      const scheduledAt = new Date(
        startTime.getTime() +
          index *
            data.delaySeconds *
            1000
      );

      return {
        id,
        recipient: recipient.email,
        subject: data.subject,
        body: data.body,
        scheduledAt,
        batchId: batch.id,
        senderId: sender.id,
        bullJobId: id,
      };
    }
  );

  /*
   * Insert all email records in one database operation.
   *
   * This is efficient for large campaigns such as
   * 1000+ recipients.
   */
  await prisma.emailJob.createMany({
    data: emailJobs,
  });

  /*
   * Add all emails to BullMQ in one bulk operation.
   */
  await emailQueue.addBulk(
    emailJobs.map((emailJob) => ({
      name: "send-email",

      data: {
        jobId: emailJob.id,
        batchId: batch.id,
        senderId: sender.id,
        recipient: emailJob.recipient,
        subject: emailJob.subject,
        body: emailJob.body,
      },

      opts: {
        jobId: emailJob.id,

        delay: Math.max(
          0,
          emailJob.scheduledAt.getTime() -
            Date.now()
        ),
      },
    }))
  );

  /*
   * Prepare Elasticsearch documents.
   */
  const elasticsearchDocuments =
    emailJobs.map((emailJob) => ({
      id: emailJob.id,
      recipient: emailJob.recipient,
      subject: emailJob.subject,
      body: emailJob.body,
      scheduledAt: emailJob.scheduledAt,
      status: "SCHEDULED",
      senderId: emailJob.senderId,
      batchId: emailJob.batchId,
      userId,
      sentAt: null,
      failedAt: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  /*
   * Index all scheduled emails using one Elasticsearch
   * bulk request instead of one request per email.
   *
   * This is much more suitable for 1000+ email campaigns.
   */
  try {
    await indexEmailJobsBulk(
      elasticsearchDocuments
    );
  } catch (error) {
    /*
     * PostgreSQL and BullMQ remain the source of
     * scheduling/execution state.
     *
     * Elasticsearch is a secondary search index.
     * Therefore an Elasticsearch indexing failure
     * should not make an already-created campaign fail.
     */
    console.error(
      "Elasticsearch bulk indexing failed for batch:",
      batch.id,
      error
    );
  }

  return batch;
};