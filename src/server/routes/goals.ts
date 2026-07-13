import { Elysia } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { goalInput } from "@/lib/validators";
import { authGuard } from "@/server/auth-macro";

export const goalsRoutes = new Elysia({ prefix: "/goals" })
  .use(authGuard)
  .get(
    "/",
    async ({ user }) => {
      const rows = await db
        .select()
        .from(savingsGoals)
        .where(eq(savingsGoals.userId, user.id))
        .orderBy(desc(savingsGoals.createdAt));

      return {
        items: rows.map((g) => ({
          ...g,
          targetAmount: Number(g.targetAmount),
          savedAmount: Number(g.savedAmount),
        })),
      };
    },
    { auth: true }
  )
  .post(
    "/",
    async ({ user, body, status }) => {
      const [row] = await db
        .insert(savingsGoals)
        .values({
          userId: user.id,
          name: body.name,
          targetAmount: String(body.targetAmount),
          savedAmount: String(body.savedAmount),
          deadline: body.deadline ?? null,
        })
        .returning();

      return status(201, row);
    },
    { auth: true, body: goalInput }
  )
  .patch(
    "/:id",
    async ({ user, params: { id }, body, status }) => {
      const { targetAmount, savedAmount, deadline, ...rest } = body;

      const [row] = await db
        .update(savingsGoals)
        .set({
          ...rest,
          ...(targetAmount !== undefined
            ? { targetAmount: String(targetAmount) }
            : {}),
          ...(savedAmount !== undefined
            ? { savedAmount: String(savedAmount) }
            : {}),
          ...(deadline !== undefined ? { deadline: deadline ?? null } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id)))
        .returning();

      if (!row) {
        return status(404, { error: "Target tidak ditemukan" });
      }
      return row;
    },
    { auth: true, body: goalInput.partial() }
  )
  .delete(
    "/:id",
    async ({ user, params: { id }, status }) => {
      const [row] = await db
        .delete(savingsGoals)
        .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id)))
        .returning({ id: savingsGoals.id });

      if (!row) {
        return status(404, { error: "Target tidak ditemukan" });
      }
      return { ok: true };
    },
    { auth: true }
  );
