import { prisma } from "../config/database";
import { env } from "../config/env";

const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

export const getSlackAuthorizationUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: "incoming-webhook",
    redirect_uri: env.SLACK_REDIRECT_URI,
    state,
  });

  return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
};

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  team?: {
    id?: string;
    name?: string;
  };
  incoming_webhook?: {
    url?: string;
    channel_id?: string;
    channel?: string;
  };
  error?: string;
}

export const exchangeSlackCode = async (
  code: string
): Promise<SlackOAuthResponse> => {
  const body = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: env.SLACK_REDIRECT_URI,
  });

  const response = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Slack OAuth request failed with status ${response.status}`
    );
  }

  const data = (await response.json()) as SlackOAuthResponse;

  if (!data.ok || !data.access_token || !data.team?.id) {
    throw new Error(
      data.error || "Slack OAuth authorization failed"
    );
  }

  return data;
};

export const saveSlackConnection = async (
  userId: string,
  slackData: SlackOAuthResponse
): Promise<void> => {
  if (!slackData.access_token || !slackData.team?.id) {
    throw new Error("Incomplete Slack OAuth response");
  }

  await prisma.slackConnection.upsert({
    where: {
      userId,
    },
    update: {
      teamId: slackData.team.id,
      teamName: slackData.team.name ?? null,
      accessToken: slackData.access_token,
      webhookUrl: slackData.incoming_webhook?.url ?? null,
    },
    create: {
      userId,
      teamId: slackData.team.id,
      teamName: slackData.team.name ?? null,
      accessToken: slackData.access_token,
      webhookUrl: slackData.incoming_webhook?.url ?? null,
    },
  });
};

export const getSlackConnection = async (userId: string) => {
  return prisma.slackConnection.findUnique({
    where: {
      userId,
    },
  });
};