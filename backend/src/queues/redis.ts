export const hasRedisUrl = () => Boolean(process.env.REDIS_URL?.trim());

const getRedisUrl = () => {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    throw new Error("REDIS_URL is missing");
  }

  if (redisUrl.startsWith("http://") || redisUrl.startsWith("https://")) {
    throw new Error(
      "REDIS_URL must be a Redis TCP URL, not the Upstash REST URL",
    );
  }

  if (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://")) {
    throw new Error("REDIS_URL must start with redis:// or rediss://");
  }

  return redisUrl;
};

export const getRedisConnectionOptions = () => {
  const redisUrl = new URL(getRedisUrl());
  const db = redisUrl.pathname ? Number(redisUrl.pathname.slice(1)) : 0;

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username
      ? decodeURIComponent(redisUrl.username)
      : undefined,
    password: redisUrl.password
      ? decodeURIComponent(redisUrl.password)
      : undefined,
    db: Number.isFinite(db) ? db : 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: redisUrl.protocol === "rediss:" ? {} : undefined,
  };
};
