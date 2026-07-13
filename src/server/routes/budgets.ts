import { Elysia } from "elysia";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgets, transactions } from "@/db/schema";
import { budgetInput } from "@/lib/validators";
import { currentMonth } from "@/lib/format";
import { authGuard } from "@/server/auth-macro";
import { monthRange } from "@/server/month";

const monthQuery = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const budgetsRoutes = new Elysia({ prefix: "/budgets" })
  .use(authGuard)
  .get(
    "/",
    async ({ user, query }) => {
      const month = query.month ?? currentMonth();
      const { start, end } = monthRange(month);

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
              gte(transactions.date, start),
              lte(transactions.date, end)
            )
          )
          .groupBy(transactions.category),
      ]);

      const spentMap = new Map(
        spentRows.map((r) => [r.category, Number(r.total)])
      );

      return {
        month,
        items: budgetRows.map((b) => ({
          id: b.id,
          category: b.category,
          amount: Number(b.amount),
          spent: spentMap.get(b.category) ?? 0,
        })),
      };
    },
    { auth: true, query: monthQuery }
  )
  .put(
    "/",
    async ({ user, body }) => {
      const [row] = await db
        .insert(budgets)
        .values({
          userId: user.id,
          category: body.category,
          amount: String(body.amount),
          month: body.month,
        })
        .onConflictDoUpdate({
          target: [budgets.userId, budgets.category, budgets.month],
          set: { amount: String(body.amount), updatedAt: new Date() },
        })
        .returning();

      return row;
    },
    { auth: true, body: budgetInput }
  )
  .delete(
    "/:id",
    async ({ user, params: { id }, status }) => {
      const [row] = await db
        .delete(budgets)
        .where(and(eq(budgets.id, id), eq(budgets.userId, user.id)))
        .returning({ id: budgets.id });

      if (!row) {
        return status(404, { error: "Budget tidak ditemukan" });
      }
      return { ok: true };
    },
    { auth: true }
  );
