import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, savingsGoals, transactions } from "@/db/schema";
import { monthRange } from "@/server/month";

export type SummaryData = Awaited<ReturnType<typeof getSummaryData>>;

/**
 * Ringkasan dashboard untuk satu bulan.
 *
 * Semua query dijalankan satu gelombang lewat Promise.all: sebelumnya lima
 * query berurutan, jadi lima kali round trip ke Neon menumpuk di jalur LCP.
 * Dipakai oleh route /api/summary dan oleh prefetch server di halaman
 * dashboard, sehingga keduanya tidak pernah berbeda hasil.
 */
export async function getSummaryData(userId: string, month: string) {
  const { start, end } = monthRange(month);

  const [y, m] = month.split("-").map(Number);
  const firstMonthDate = new Date(y, m - 1 - 5, 1);
  const seriesStart = `${firstMonthDate.getFullYear()}-${String(firstMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

  const [totals, monthTotals, monthBudgets, spentRows, goalRows, seriesRows] =
    await Promise.all([
      /* Saldo total: seluruh waktu */
      db
        .select({
          type: transactions.type,
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .groupBy(transactions.type),

      /* Pemasukan & pengeluaran bulan ini */
      db
        .select({
          type: transactions.type,
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.date, start),
            lte(transactions.date, end)
          )
        )
        .groupBy(transactions.type),

      db
        .select({ category: budgets.category, amount: budgets.amount })
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.month, month))),

      /* Pengeluaran per kategori bulan ini, difilter ke kategori berbudget setelahnya */
      db
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
        .groupBy(transactions.category),

      /* Progress tabungan */
      db
        .select({
          target: sql<string>`coalesce(sum(${savingsGoals.targetAmount}), 0)`,
          saved: sql<string>`coalesce(sum(${savingsGoals.savedAmount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(savingsGoals)
        .where(eq(savingsGoals.userId, userId)),

      /* Tren 6 bulan terakhir */
      db
        .select({
          month: sql<string>`to_char(${transactions.date}::date, 'YYYY-MM')`,
          type: transactions.type,
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.date, seriesStart),
            lte(transactions.date, end)
          )
        )
        .groupBy(sql`1`, transactions.type),
    ]);

  const allIncome = Number(totals.find((t) => t.type === "income")?.total ?? 0);
  const allExpense = Number(
    totals.find((t) => t.type === "expense")?.total ?? 0
  );

  const monthIncome = Number(
    monthTotals.find((t) => t.type === "income")?.total ?? 0
  );
  const monthExpense = Number(
    monthTotals.find((t) => t.type === "expense")?.total ?? 0
  );

  const budgetTotal = monthBudgets.reduce((s, b) => s + Number(b.amount), 0);
  const budgeted = new Set(monthBudgets.map((b) => b.category));
  const budgetSpent =
    monthBudgets.length > 0
      ? spentRows
          .filter((r) => budgeted.has(r.category))
          .reduce((s, r) => s + Number(r.total), 0)
      : 0;

  const goalTarget = Number(goalRows[0]?.target ?? 0);
  const goalSaved = Number(goalRows[0]?.saved ?? 0);
  const goalCount = Number(goalRows[0]?.count ?? 0);

  const series: { month: string; expense: number; income: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(y, m - 1 - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    series.push({
      month: key,
      expense: Number(
        seriesRows.find((r) => r.month === key && r.type === "expense")
          ?.total ?? 0
      ),
      income: Number(
        seriesRows.find((r) => r.month === key && r.type === "income")?.total ??
          0
      ),
    });
  }

  return {
    month,
    balance: allIncome - allExpense,
    monthIncome,
    monthExpense,
    budgetTotal,
    budgetSpent,
    budgetRemaining: Math.max(budgetTotal - budgetSpent, 0),
    goalTarget,
    goalSaved,
    goalCount,
    series,
  };
}
