import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { receiptItems, transactions } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { transactionInput } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuthErrors(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  if (!tx) {
    return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }

  const [items, siblings] = await Promise.all([
    db
      .select({
        id: receiptItems.id,
        name: receiptItems.name,
        quantity: receiptItems.quantity,
        amount: receiptItems.amount,
      })
      .from(receiptItems)
      .where(eq(receiptItems.transactionId, id)),
    tx.receiptGroupId
      ? db
          .select({
            id: transactions.id,
            category: transactions.category,
            amount: transactions.amount,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.receiptGroupId, tx.receiptGroupId),
              eq(transactions.userId, user.id),
              ne(transactions.id, id)
            )
          )
      : Promise.resolve([]),
  ]);

  return Response.json({
    ...tx,
    items: items.map((i) => ({ ...i, amount: Number(i.amount) })),
    siblings: siblings.map((s) => ({ ...s, amount: Number(s.amount) })),
  });
});

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
