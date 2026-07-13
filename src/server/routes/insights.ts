import { createHash } from "crypto";
import { Elysia } from "elysia";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgets, transactions } from "@/db/schema";
import { getGemini, geminiErrorInfo, GEMINI_MODEL } from "@/lib/gemini";
import { getRedis } from "@/lib/redis";
import { checkBurst, LIMITS } from "@/lib/rate-limit";
import { currentMonth } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/categories";
import { authGuard } from "@/server/auth-macro";
import { monthRange, prevMonth } from "@/server/month";

/* Cache di-key hash data: data tidak berubah = tidak pernah panggil Gemini lagi */
const INSIGHTS_CACHE_TTL_SEC = 7 * 24 * 60 * 60;

const insightsResult = z.object({
  insights: z
    .array(
      z.object({
        text: z.string(),
        tone: z.enum(["positive", "warning", "info"]),
      })
    )
    .max(4),
});

type InsightsPayload = z.infer<typeof insightsResult>;

const monthQuery = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

async function expenseByCategory(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const rows = await db
    .select({
      category: transactions.category,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, start),
        lte(transactions.date, end)
      )
    )
    .groupBy(transactions.category);
  return rows.map((r) => ({ category: r.category, total: Number(r.total) }));
}

export const insightsRoutes = new Elysia({ prefix: "/insights" })
  .use(authGuard)
  .get(
    "/",
    async ({ user, query, status }) => {
      const month = query.month ?? currentMonth();
      const lastMonth = prevMonth(month);

      const [thisMonthRows, lastMonthRows, budgetRows] = await Promise.all([
        expenseByCategory(user.id, month),
        expenseByCategory(user.id, lastMonth),
        db
          .select({ category: budgets.category, amount: budgets.amount })
          .from(budgets)
          .where(and(eq(budgets.userId, user.id), eq(budgets.month, month))),
      ]);

      if (thisMonthRows.length === 0 && lastMonthRows.length === 0) {
        return { insights: [] } as InsightsPayload;
      }

      const label = (c: string) =>
        CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c;

      const dataSummary = {
        bulanIni: thisMonthRows.map((r) => `${label(r.category)}: ${r.total}`),
        bulanLalu: lastMonthRows.map((r) => `${label(r.category)}: ${r.total}`),
        budget: budgetRows.map((b) => {
          const spent =
            thisMonthRows.find((r) => r.category === b.category)?.total ?? 0;
          return `${label(b.category)}: budget ${Number(b.amount)}, terpakai ${spent}`;
        }),
      };

      /* Cache berbasis hash data: key baru hanya saat data berubah */
      const redis = getRedis();
      const dataHash = createHash("sha256")
        .update(JSON.stringify(dataSummary))
        .digest("hex")
        .slice(0, 16);
      const cacheKey = `insights:${user.id}:${month}:${dataHash}`;
      if (redis) {
        const cached = await redis.get<InsightsPayload>(cacheKey);
        if (cached) return cached;
      }

      const burst = await checkBurst(
        "insights",
        user.id,
        LIMITS.insightsBurst.limit,
        LIMITS.insightsBurst.windowSec
      );
      if (!burst.ok) {
        return status(burst.status, { error: burst.error });
      }

      let response;
      try {
        response = await getGemini().models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: [
                    "Kamu asisten keuangan pribadi untuk anak muda Indonesia.",
                    "Berdasarkan data pengeluaran berikut (angka dalam rupiah), buat maksimal 4 insight singkat berbahasa Indonesia yang santai dan actionable.",
                    "Sebutkan angka atau persentase konkret. Satu kalimat per insight.",
                    "tone: 'warning' untuk budget hampir habis/lewat atau kenaikan tajam, 'positive' untuk penurunan pengeluaran atau kebiasaan baik, 'info' untuk observasi netral.",
                    `Data bulan ini (${month}): ${JSON.stringify(dataSummary.bulanIni)}`,
                    `Data bulan lalu (${lastMonth}): ${JSON.stringify(dataSummary.bulanLalu)}`,
                    `Budget bulan ini: ${JSON.stringify(dataSummary.budget)}`,
                  ].join("\n"),
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      tone: {
                        type: "string",
                        enum: ["positive", "warning", "info"],
                      },
                    },
                    required: ["text", "tone"],
                  },
                },
              },
              required: ["insights"],
            },
            temperature: 0.4,
            maxOutputTokens: 512,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
      } catch (err) {
        const info = geminiErrorInfo(err);
        return status(info.status, { error: info.error });
      }

      try {
        const parsed = insightsResult.parse(JSON.parse(response.text ?? ""));
        if (redis) {
          await redis.set(cacheKey, parsed, { ex: INSIGHTS_CACHE_TTL_SEC });
        }
        return parsed;
      } catch {
        return status(502, { error: "Gagal membuat insight. Coba lagi nanti." });
      }
    },
    { auth: true, query: monthQuery }
  );
