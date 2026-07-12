import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, transactions } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { budgetInput } from "@/lib/validators";
import { currentMonth } from "@/lib/format";

export const GET = withAuthErrors(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? currentMonth();
  const [y, m] = month.split("-").map(Number);
  const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const [budgetRows, spentRows] = await Promise.all([
    db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, user.id), eq(budgets.month, month))),
    db
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
      .groupBy(transactions.category),
  ]);

  const spentMap = new Map(spentRows.map((r) => [r.category, Number(r.total)]));

  return Response.json({
    month,
    items: budgetRows.map((b) => ({
      id: b.id,
      category: b.category,
      amount: Number(b.amount),
      spent: spentMap.get(b.category) ?? 0,
    })),
  });
});

export const PUT = withAuthErrors(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = budgetInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(budgets)
    .values({
      userId: user.id,
      category: parsed.data.category,
      amount: String(parsed.data.amount),
      month: parsed.data.month,
    })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.category, budgets.month],
      set: { amount: String(parsed.data.amount), updatedAt: new Date() },
    })
    .returning();

  return Response.json(row);
});
