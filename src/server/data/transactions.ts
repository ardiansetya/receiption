import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, type Category } from "@/db/schema";
import { monthRange } from "@/server/month";

export type TransactionListOptions = {
  month?: string;
  category?: Category;
  type?: "income" | "expense";
  limit?: number;
  offset?: number;
};

/**
 * Daftar transaksi terurut tanggal desc beserta total baris.
 * Dipakai route /api/transactions dan prefetch server halaman transaksi.
 */
export async function listTransactionsData(
  userId: string,
  opts: TransactionListOptions
) {
  const conditions = [eq(transactions.userId, userId)];

  if (opts.month) {
    const { start, end } = monthRange(opts.month);
    conditions.push(gte(transactions.date, start), lte(transactions.date, end));
  }
  if (opts.category) {
    conditions.push(eq(transactions.category, opts.category));
  }
  if (opts.type) {
    conditions.push(eq(transactions.type, opts.type));
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(transactions).where(where),
  ]);

  return { items: rows, total: Number(countRows[0]?.count ?? 0) };
}
