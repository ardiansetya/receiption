import { treaty } from "@elysiajs/eden";
import type { App } from "@/server/app";

/*
 * Eden treaty: client API dengan tipe end-to-end dari server Elysia.
 * Import tipe App tidak membawa kode server ke bundle client (type-only).
 */
const baseUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const api = treaty<App>(baseUrl).api;

/** Ambil pesan error dari body respons API ({ error: string }). */
export function apiErrorMessage(
  value: unknown,
  fallback = "Terjadi kesalahan"
): string {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "string"
  ) {
    return (value as { error: string }).error;
  }
  return fallback;
}
