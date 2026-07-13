import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Untuk server component/layout: user dari sesi Better Auth atau null. */
export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
