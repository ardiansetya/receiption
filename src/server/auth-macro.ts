import { Elysia } from "elysia";
import { auth } from "@/lib/auth";

/**
 * Macro `auth: true`: validasi sesi Better Auth dari cookie request,
 * lalu sediakan `user` di context handler. Tanpa sesi: 401.
 */
export const authGuard = new Elysia({ name: "auth-guard" }).macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const session = await auth.api.getSession({ headers });
      if (!session) return status(401, { error: "Unauthorized" });
      return { user: session.user };
    },
  },
});
