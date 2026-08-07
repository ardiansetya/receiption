import { randomUUID } from "crypto";
import type { Category } from "@/db/schema";

export type ReceiptBatchItem = {
  name: string;
  quantity: number;
  amount: number;
  category: Category;
};

/**
 * Susun baris transaksi + rincian item dari satu nota: item dikelompokkan
 * per kategori, satu transaksi per kategori. Id transaksi dibuat di aplikasi
 * agar insert transaksi dan item bisa masuk satu batch atomik.
 *
 * Dipakai oleh POST /transactions/batch (nota penuh) dan POST /splits
 * (hanya porsi pengguna), sehingga invarian sum(item) === transaksi.amount
 * berlaku di kedua jalur.
 */
export function buildReceiptBatch(
  userId: string,
  input: {
    storeName: string;
    date: string;
    receiptGroupId: string;
    note?: string | null;
    items: ReceiptBatchItem[];
  }
) {
  const groups = new Map<Category, ReceiptBatchItem[]>();
  for (const item of input.items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }

  const grouped = [...groups.entries()].map(([category, items]) => ({
    id: randomUUID(),
    category,
    items,
    amount: items.reduce((s, i) => s + i.amount, 0),
  }));

  const txRows = grouped.map((g) => ({
    id: g.id,
    userId,
    type: "expense" as const,
    category: g.category,
    amount: String(g.amount),
    title: input.storeName,
    note: input.note ?? null,
    date: input.date,
    source: "ocr" as const,
    receiptGroupId: input.receiptGroupId,
  }));

  const itemRows = grouped.flatMap((g) =>
    g.items.map((i) => ({
      transactionId: g.id,
      userId,
      name: i.name,
      quantity: i.quantity,
      amount: String(i.amount),
    }))
  );

  const summary = grouped.map((g) => ({
    id: g.id,
    category: g.category,
    amount: g.amount,
    itemCount: g.items.length,
  }));

  return { txRows, itemRows, summary };
}
