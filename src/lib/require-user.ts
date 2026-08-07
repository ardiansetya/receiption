import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Untuk server component/layout: user dari sesi Better Auth atau null.
 *
 * Dibungkus cache() agar layout dan page dalam satu request hanya sekali
 * menembak database untuk sesi yang sama.
 */
export const getUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});
