import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

/**
 * Klien Upstash Redis, atau null bila env belum di-set.
 * Fitur yang bergantung Redis (rate limit, kuota, cache) wajib
 * menangani null dengan degradasi yang aman.
 */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    console.warn("[redis] UPSTASH_REDIS_REST_URL/TOKEN belum di-set. Rate limit nonaktif.");
    client = null;
    return client;
  }
  client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return client;
}
