import { redisConnection } from "../config/redis";

const WINDOW_SECONDS = 60 * 60;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAt: Date;
  scheduledAt: Date;
  shouldNotifySlack: boolean;
}

const RESERVE_SLOT_SCRIPT = `
local countKey = KEYS[1]
local slotKey = KEYS[2]
local alertKey = KEYS[3]

local hourlyLimit = tonumber(ARGV[1])
local nowMs = tonumber(ARGV[2])
local delayMs = tonumber(ARGV[3])
local windowEndMs = tonumber(ARGV[4])
local windowSeconds = tonumber(ARGV[5])

local count = tonumber(redis.call("GET", countKey) or "0")

if count >= hourlyLimit then
  local shouldNotify = 0

  if redis.call("EXISTS", alertKey) == 0 then
    redis.call(
      "SET",
      alertKey,
      "1",
      "EX",
      windowSeconds
    )

    shouldNotify = 1
  end

  return {
    0,
    count,
    windowEndMs,
    windowEndMs,
    shouldNotify
  }
end

local lastSlot = tonumber(
  redis.call("GET", slotKey) or "0"
)

local scheduledAt = nowMs

if lastSlot + delayMs > scheduledAt then
  scheduledAt = lastSlot + delayMs
end

local newCount = redis.call(
  "INCR",
  countKey
)

redis.call(
  "EXPIRE",
  countKey,
  windowSeconds
)

redis.call(
  "SET",
  slotKey,
  tostring(scheduledAt),
  "EX",
  windowSeconds
)

return {
  1,
  newCount,
  windowEndMs,
  scheduledAt,
  0
}
`;

export const checkAndReserveRateLimit = async (
  senderId: string,
  hourlyLimit: number,
  delaySeconds: number
): Promise<RateLimitResult> => {
  const now = Date.now();

  const windowStartMs =
    Math.floor(
      now / (WINDOW_SECONDS * 1000)
    ) *
    WINDOW_SECONDS *
    1000;

  const windowEndMs =
    windowStartMs +
    WINDOW_SECONDS * 1000;

  const windowKey =
    Math.floor(windowStartMs / 1000);

  const countKey =
    `rate-limit:${senderId}:${windowKey}`;

  const slotKey =
    `rate-limit-slot:${senderId}`;

  const alertKey =
    `rate-limit-alert:${senderId}:${windowKey}`;

  const delayMs =
    Math.max(0, delaySeconds * 1000);

  const result = (await redisConnection.eval(
    RESERVE_SLOT_SCRIPT,
    3,
    countKey,
    slotKey,
    alertKey,
    hourlyLimit,
    now,
    delayMs,
    windowEndMs,
    WINDOW_SECONDS
  )) as [
    number,
    number,
    number,
    number,
    number
  ];

  const [
    allowedValue,
    count,
    retryAtMs,
    scheduledAtMs,
    notifySlackValue,
  ] = result;

  return {
    allowed: allowedValue === 1,
    count,
    retryAt: new Date(retryAtMs),
    scheduledAt: new Date(
      scheduledAtMs || retryAtMs
    ),
    shouldNotifySlack:
      notifySlackValue === 1,
  };
};