import { Elysia } from "elysia";
import { transactionsRoutes } from "@/server/routes/transactions";
import { budgetsRoutes } from "@/server/routes/budgets";
import { goalsRoutes } from "@/server/routes/goals";
import { statsRoutes } from "@/server/routes/stats";
import { summaryRoutes } from "@/server/routes/summary";
import { insightsRoutes } from "@/server/routes/insights";
import { ocrRoutes } from "@/server/routes/ocr";

/** Ambil pesan issue pertama dari ValidationError (zod/TypeBox) agar toast tetap ramah. */
function validationMessage(err: unknown): string {
  const all = (err as { all?: unknown }).all;
  if (Array.isArray(all)) {
    for (const issue of all) {
      const message = (issue as { message?: unknown } | null)?.message;
      if (typeof message === "string" && message.length > 0) return message;
    }
  }
  return "Input tidak valid";
}

/**
 * Server Elysia untuk seluruh API (kecuali /api/auth milik Better Auth).
 * Di-mount lewat catch-all route Next.js: src/app/api/[[...slugs]]/route.ts.
 */
export const app = new Elysia({ prefix: "/api" })
  .onError(({ code, error, status }) => {
    if (code === "VALIDATION") {
      return status(422, { error: validationMessage(error) });
    }
    if (code === "NOT_FOUND") {
      return status(404, { error: "Tidak ditemukan" });
    }
    console.error(error);
    return status(500, { error: "Internal server error" });
  })
  .use(transactionsRoutes)
  .use(budgetsRoutes)
  .use(goalsRoutes)
  .use(statsRoutes)
  .use(summaryRoutes)
  .use(insightsRoutes)
  .use(ocrRoutes);

/** Tipe aplikasi untuk Eden treaty (end-to-end type safety). */
export type App = typeof app;
