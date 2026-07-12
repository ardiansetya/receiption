import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";
import { currentMonth } from "./format";

/* Burst limit per akun: cegah spam beruntun ke endpoint AI. */
const burstLimiters = new Map<string, Ratelimit>();

function getBurstLimiter(feature: string, limit: number, windowSec: number) {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${feature}:${limit}:${windowSec}`;
  let limiter = burstLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `burst:${feature}`,
    });
    burstLimiters.set(key, limiter);
  }
  return limiter;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; status: 429; error: string };

/**
 * Cek burst limit per user. Tanpa Redis: lolos (degradasi aman).
 */
export async function checkBurst(
  feature: string,
  userId: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const limiter = getBurstLimiter(feature, limit, windowSec);
  if (!limiter) return { ok: true };

  const { success, reset } = await limiter.limit(userId);
  if (success) return { ok: true };

  const waitSec = Math.max(Math.ceil((reset - Date.now()) / 1000), 1);
  return {
    ok: false,
    status: 429,
    error: `Terlalu banyak permintaan. Coba lagi dalam ${waitSec} detik.`,
  };
}

/**
 * Kuota bulanan per akun (mis. 30 scan/bulan untuk paket Free).
 * Counter INCR dengan TTL 45 hari; kunci berganti tiap bulan.
 * Tanpa Redis: lolos.
 */
export async function checkMonthlyQuota(
  feature: string,
  userId: string,
  limit: number
): Promise<RateLimitResult & { remaining?: number }> {
  const redis = getRedis();
  if (!redis) return { ok: true };

  const key = `quota:${feature}:${userId}:${currentMonth()}`;
  const used = await redis.incr(key);
  if (used === 1) {
    await redis.expire(key, 60 * 60 * 24 * 45);
  }

  if (used > limit) {
    return {
      ok: false,
      status: 429,
      error: `Kuota ${feature === "ocr" ? "scan struk" : "insight"} bulan ini habis (${limit}/bulan). Reset awal bulan depan.`,
    };
  }
  return { ok: true, remaining: limit - used };
}

/** Kembalikan satu jatah kuota (dipakai bila proses AI gagal). */
export async function refundMonthlyQuota(feature: string, userId: string) {
  const redis = getRedis();
  if (!redis) return;
  await redis.decr(`quota:${feature}:${userId}:${currentMonth()}`);
}

export const LIMITS = {
  /* Paket Free sesuai rencana produk */
  ocrMonthly: 30,
  ocrBurst: { limit: 5, windowSec: 60 },
  insightsBurst: { limit: 10, windowSec: 60 },
} as const;
