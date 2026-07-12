import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { goalInput } from "@/lib/validators";

export const GET = withAuthErrors(async () => {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, user.id))
    .orderBy(desc(savingsGoals.createdAt));

  return Response.json({
    items: rows.map((g) => ({
      ...g,
      targetAmount: Number(g.targetAmount),
      savedAmount: Number(g.savedAmount),
    })),
  });
});

export const POST = withAuthErrors(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = goalInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(savingsGoals)
    .values({
      userId: user.id,
      name: parsed.data.name,
      targetAmount: String(parsed.data.targetAmount),
      savedAmount: String(parsed.data.savedAmount),
      deadline: parsed.data.deadline ?? null,
    })
    .returning();

  return Response.json(row, { status: 201 });
});
