import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, savingsGoals, transactions } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { currentMonth } from "@/lib/format";

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  return { start, end };
}

export const GET = withAuthErrors(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? currentMonth();
  const { start, end } = monthRange(month);

  /* Saldo total: seluruh waktu */
  const totals = await db
    .select({
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.userId, user.id))
    .groupBy(transactions.type);

  const allIncome = Number(totals.find((t) => t.type === "income")?.total ?? 0);
  const allExpense = Number(
    totals.find((t) => t.type === "expense")?.total ?? 0
  );

  /* Pemasukan & pengeluaran bulan ini */
  const monthTotals = await db
    .select({
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        gte(transactions.date, start),
        lte(transactions.date, end)
      )
    )
    .groupBy(transactions.type);

  const monthIncome = Number(
    monthTotals.find((t) => t.type === "income")?.total ?? 0
  );
  const monthExpense = Number(
    monthTotals.find((t) => t.type === "expense")?.total ?? 0
  );

  /* Sisa budget: total budget bulan ini dikurangi pengeluaran pada kategori yang dibudget */
  const monthBudgets = await db
    .select({ category: budgets.category, amount: budgets.amount })
    .from(budgets)
    .where(and(eq(budgets.userId, user.id), eq(budgets.month, month)));

  const budgetTotal = monthBudgets.reduce((s, b) => s + Number(b.amount), 0);

  let budgetSpent = 0;
  if (monthBudgets.length > 0) {
    const spentRows = await db
      .select({
        category: transactions.category,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.type, "expense"),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      )
      .groupBy(transactions.category);

    const budgeted = new Set(monthBudgets.map((b) => b.category));
    budgetSpent = spentRows
      .filter((r) => budgeted.has(r.category))
      .reduce((s, r) => s + Number(r.total), 0);
  }

  /* Progress tabungan */
  const goalRows = await db
    .select({
      target: sql<string>`coalesce(sum(${savingsGoals.targetAmount}), 0)`,
      saved: sql<string>`coalesce(sum(${savingsGoals.savedAmount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, user.id));

  const goalTarget = Number(goalRows[0]?.target ?? 0);
  const goalSaved = Number(goalRows[0]?.saved ?? 0);
  const goalCount = Number(goalRows[0]?.count ?? 0);

  /* Tren 6 bulan terakhir */
  const [y, m] = month.split("-").map(Number);
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

  return Response.json({
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
  });
});
