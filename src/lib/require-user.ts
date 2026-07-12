import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Untuk route handler: kembalikan user atau lempar Response 401. */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/** Bungkus handler agar Response yang dilempar requireUser dikembalikan rapi. */
export function withAuthErrors<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof Response) return err;
      console.error(err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
