import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";

type Params = { params: Promise<{ id: string }> };

export const DELETE = withAuthErrors(
  async (_req: Request, { params }: Params) => {
    const user = await requireUser();
    const { id } = await params;

    const [row] = await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, user.id)))
      .returning({ id: budgets.id });

    if (!row) {
      return Response.json({ error: "Budget tidak ditemukan" }, { status: 404 });
    }
    return Response.json({ ok: true });
  }
);
