import { prisma } from "../config/database";
import { ScheduleEmailInput } from "../types/email.types";
import { validateScheduleEmail } from "../validators/email.validator";
import { scheduleEmailBatch } from "./scheduler.service";

export const createEmailBatch = async (
  userId: string,
  data: ScheduleEmailInput
) => {
  const validationError = validateScheduleEmail(data);

  if (validationError) {
    throw new Error(validationError);
  }

  return scheduleEmailBatch(userId, data);
};

export const getScheduledEmails = async (userId: string) => {
  return prisma.emailJob.findMany({
    where: {
      batch: {
        userId,
      },
      status: "SCHEDULED",
    },
    include: {
      sender: true,
      batch: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });
};

export const getSentEmails = async (userId: string) => {
  return prisma.emailJob.findMany({
    where: {
      batch: {
        userId,
      },
      status: "SENT",
    },
    include: {
      sender: true,
      batch: true,
    },
    orderBy: {
      sentAt: "desc",
    },
  });
};