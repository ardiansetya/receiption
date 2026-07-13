import { Elysia } from "elysia";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { currentMonth } from "@/lib/format";
import { authGuard } from "@/server/auth-macro";

const monthQuery = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const statsRoutes = new Elysia({ prefix: "/stats" })
  .use(authGuard)
  .get(
    "/",
    async ({ user, query }) => {
      const month = query.month ?? currentMonth();
      const [y, m] = month.split("-").map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const end = `${month}-${String(daysInMonth).padStart(2, "0")}`;

      /* Pengeluaran per kategori bulan ini */
      const byCategory = await db
        .select({
          category: transactions.category,
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.type, "expense"),
            gte(transactions.date, `${month}-01`),
            lte(transactions.date, end)
          )
        )
        .groupBy(transactions.category)
        .orderBy(sql`sum(${transactions.amount}) desc`);

      /* Seri 6 bulan: pemasukan + pengeluaran */
      const firstMonthDate = new Date(y, m - 1 - 5, 1);
      const seriesStart = `${firstMonthDate.getFullYear()}-${String(firstMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

      const seriesRows = await db
        .select({
          month: sql<string>`to_char(${transactions.date}::date, 'YYYY-MM')`,
          type: transactions.type,
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            gte(transactions.date, seriesStart),
            lte(transactions.date, end)
          )
        )
        .groupBy(sql`1`, transactions.type);

      const series: { month: string; income: number; expense: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(y, m - 1 - 5 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        series.push({
          month: key,
          income: Number(
            seriesRows.find((r) => r.month === key && r.type === "income")
              ?.total ?? 0
          ),
          expense: Number(
            seriesRows.find((r) => r.month === key && r.type === "expense")
              ?.total ?? 0
          ),
        });
      }

      const monthExpense = byCategory.reduce((s, r) => s + Number(r.total), 0);

      /* Rata-rata harian: bulan berjalan pakai hari yang sudah lewat */
      const now = new Date();
      const isCurrent = month === currentMonth();
      const elapsedDays = isCurrent ? now.getDate() : daysInMonth;
      const avgDaily =
        elapsedDays > 0 ? Math.round(monthExpense / elapsedDays) : 0;

      return {
        month,
        monthExpense,
        avgDaily,
        byCategory: byCategory.map((r) => ({
          category: r.category,
          total: Number(r.total),
        })),
        series,
      };
    },
    { auth: true, query: monthQuery }
  );
