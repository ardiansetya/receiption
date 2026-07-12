import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { goalInput } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withAuthErrors(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;
  const body = await req.json();
  const parsed = goalInput.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const { targetAmount, savedAmount, deadline, ...rest } = parsed.data;

  const [row] = await db
    .update(savingsGoals)
    .set({
      ...rest,
      ...(targetAmount !== undefined
        ? { targetAmount: String(targetAmount) }
        : {}),
      ...(savedAmount !== undefined ? { savedAmount: String(savedAmount) } : {}),
      ...(deadline !== undefined ? { deadline: deadline ?? null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id)))
    .returning();

  if (!row) {
    return Response.json({ error: "Target tidak ditemukan" }, { status: 404 });
  }
  return Response.json(row);
});

export const DELETE = withAuthErrors(
  async (_req: Request, { params }: Params) => {
    const user = await requireUser();
    const { id } = await params;

    const [row] = await db
      .delete(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id)))
      .returning({ id: savingsGoals.id });

    if (!row) {
      return Response.json({ error: "Target tidak ditemukan" }, { status: 404 });
    }
    return Response.json({ ok: true });
  }
);
