import { randomUUID } from "crypto";
import { db } from "@/db";
import { receiptItems, transactions, type Category } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { receiptBatchInput } from "@/lib/validators";

/**
 * Simpan hasil scan nota: item dikelompokkan per kategori,
 * satu transaksi per kategori + rincian item, dalam satu batch atomik.
 */
export const POST = withAuthErrors(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = receiptBatchInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const { storeName, date, items } = parsed.data;
  const receiptGroupId = randomUUID();

  /* Kelompokkan item per kategori */
  const groups = new Map<Category, typeof items>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }

  /* Id transaksi dibuat di aplikasi agar insert transaksi + item bisa satu batch */
  const txRows = [...groups.entries()].map(([cat, groupItems]) => ({
    id: randomUUID(),
    userId: user.id,
    type: "expense" as const,
    category: cat,
    amount: String(groupItems.reduce((s, i) => s + i.amount, 0)),
    title: storeName,
    date,
    source: "ocr" as const,
    receiptGroupId,
    items: groupItems,
  }));

  const itemRows = txRows.flatMap((tx) =>
    tx.items.map((i) => ({
      transactionId: tx.id,
      userId: user.id,
      name: i.name,
      quantity: i.quantity,
      amount: String(i.amount),
    }))
  );

  await db.batch([
    db.insert(transactions).values(
      txRows.map(({ items: _items, ...tx }) => tx)
    ),
    db.insert(receiptItems).values(itemRows),
  ]);

  return Response.json(
    {
      receiptGroupId,
      transactions: txRows.map((tx) => ({
        id: tx.id,
        category: tx.category,
        amount: Number(tx.amount),
        itemCount: tx.items.length,
      })),
    },
    { status: 201 }
  );
});
