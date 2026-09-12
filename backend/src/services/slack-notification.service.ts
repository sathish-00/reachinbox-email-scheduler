import { prisma } from "../config/database";

interface SlackNotificationInput {
  senderId: string;
  hourlyLimit: number;
  count: number;
  retryAt: Date;
}

export const notifySlackRateLimit = async (
  userId: string,
  data: SlackNotificationInput
): Promise<void> => {
  console.log(
    "Slack notification function called:",
    {
      userId,
      senderId: data.senderId,
      hourlyLimit: data.hourlyLimit,
      count: data.count,
    }
  );

  const connection =
    await prisma.slackConnection.findUnique({
      where: {
        userId,
      },
    });

  if (!connection) {
    console.log(
      `Slack notification skipped: no Slack connection for user ${userId}`
    );
    return;
  }

  if (!connection.webhookUrl) {
    console.log(
      `Slack notification skipped: no webhook configured for user ${userId}`
    );
    return;
  }

  const message = [
    "ReachInbox hourly email limit reached",
    "",
    `Sender ID: ${data.senderId}`,
    `Hourly limit: ${data.hourlyLimit} emails`,
    `Reserved/sent in current window: ${data.count}`,
    `Emails will resume around: ${data.retryAt.toLocaleString()}`,
  ].join("\n");

  try {
    const response = await fetch(
      connection.webhookUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
        }),
      }
    );

    if (!response.ok) {
      const responseText =
        await response.text();

      throw new Error(
        `Slack webhook returned ${response.status}: ${responseText}`
      );
    }

    console.log(
      `Slack rate-limit notification sent for sender ${data.senderId}`
    );
  } catch (error) {
    console.error(
      "Failed to send Slack rate-limit notification:",
      error
    );

    /*
     * Slack failure must never cause the email
     * job to be dropped or permanently failed.
     */
  }
};