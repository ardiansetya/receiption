import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgets, transactions } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { getGemini, GEMINI_MODEL } from "@/lib/gemini";
import { currentMonth } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/categories";

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

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return {
    start: `${month}-01`,
    end: `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`,
  };
}

function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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

export const GET = withAuthErrors(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? currentMonth();
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
    return Response.json({ insights: [] });
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

  const ai = getGemini();
  const response = await ai.models.generateContent({
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
    },
  });

  try {
    const parsed = insightsResult.parse(JSON.parse(response.text ?? ""));
    return Response.json(parsed);
  } catch {
    return Response.json(
      { error: "Gagal membuat insight. Coba lagi nanti." },
      { status: 502 }
    );
  }
});
