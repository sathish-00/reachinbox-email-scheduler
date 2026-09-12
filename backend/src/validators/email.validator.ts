import { ScheduleEmailInput } from "../types/email.types";

export const validateScheduleEmail = (
  data: ScheduleEmailInput
): string | null => {
  if (!data.senderId) {
    return "senderId is required";
  }

  if (!data.subject?.trim()) {
    return "subject is required";
  }

  if (!data.body?.trim()) {
    return "body is required";
  }

  if (
    !data.recipients ||
    data.recipients.length === 0
  ) {
    return "At least one recipient is required";
  }

  for (const recipient of data.recipients) {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        recipient.email
      )
    ) {
      return `Invalid email address: ${recipient.email}`;
    }
  }

  if (
    !data.startTime ||
    Number.isNaN(Date.parse(data.startTime))
  ) {
    return "Valid startTime is required";
  }

  if (data.delaySeconds < 0) {
    return "delaySeconds cannot be negative";
  }

  if (data.hourlyLimit <= 0) {
    return "hourlyLimit must be greater than 0";
  }

  return null;
};