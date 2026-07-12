import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { transactionInput } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withAuthErrors(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;
  const body = await req.json();
  const parsed = transactionInput.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const { amount, note, receiptUrl, ...rest } = parsed.data;

  const [row] = await db
    .update(transactions)
    .set({
      ...rest,
      ...(amount !== undefined ? { amount: String(amount) } : {}),
      ...(note !== undefined ? { note: note ?? null } : {}),
      ...(receiptUrl !== undefined ? { receiptUrl: receiptUrl ?? null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .returning();

  if (!row) {
    return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }
  return Response.json(row);
});

export const DELETE = withAuthErrors(
  async (_req: Request, { params }: Params) => {
    const user = await requireUser();
    const { id } = await params;

    const [row] = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
      .returning({ id: transactions.id });

    if (!row) {
      return Response.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }
    return Response.json({ ok: true });
  }
);
