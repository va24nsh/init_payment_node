import Redis from "ioredis";

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || "redis-service",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});
