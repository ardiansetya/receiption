import { randomUUID } from "crypto";
import { Elysia } from "elysia";
import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  receiptItems,
  transactions,
  category as categoryEnum,
} from "@/db/schema";
import { receiptBatchInput, transactionInput } from "@/lib/validators";
import { authGuard } from "@/server/auth-macro";
import { buildReceiptBatch } from "@/server/receipt-batch";
import { monthRange } from "@/server/month";

const listQuery = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  category: z.enum(categoryEnum.enumValues).optional(),
  type: z.enum(["income", "expense"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const transactionsRoutes = new Elysia({ prefix: "/transactions" })
  .use(authGuard)
  .get(
    "/",
    async ({ user, query }) => {
      const conditions = [eq(transactions.userId, user.id)];

      if (query.month) {
        const { start, end } = monthRange(query.month);
        conditions.push(
          gte(transactions.date, start),
          lte(transactions.date, end)
        );
      }
      if (query.category) {
        conditions.push(eq(transactions.category, query.category));
      }
      if (query.type) {
        conditions.push(eq(transactions.type, query.type));
      }

      const where = and(...conditions);

      const [rows, countRows] = await Promise.all([
        db
          .select()
          .from(transactions)
          .where(where)
          .orderBy(desc(transactions.date), desc(transactions.createdAt))
          .limit(query.limit ?? 50)
          .offset(query.offset ?? 0),
        db
          .select({ count: sql<number>`count(*)` })
          .from(transactions)
          .where(where),
      ]);

      return {
        items: rows,
        total: Number(countRows[0]?.count ?? 0),
      };
    },
    { auth: true, query: listQuery }
  )
  .post(
    "/",
    async ({ user, body, status }) => {
      const [row] = await db
        .insert(transactions)
        .values({
          userId: user.id,
          type: body.type,
          category: body.category,
          amount: String(body.amount),
          title: body.title,
          note: body.note ?? null,
          date: body.date,
          source: body.source,
          receiptUrl: body.receiptUrl ?? null,
        })
        .returning();

      return status(201, row);
    },
    { auth: true, body: transactionInput }
  )
  /**
   * Simpan hasil scan nota: item dikelompokkan per kategori,
   * satu transaksi per kategori + rincian item, dalam satu batch atomik.
   */
  .post(
    "/batch",
    async ({ user, body, status }) => {
      const receiptGroupId = randomUUID();
      const { txRows, itemRows, summary } = buildReceiptBatch(user.id, {
        ...body,
        receiptGroupId,
      });

      await db.batch([
        db.insert(transactions).values(txRows),
        db.insert(receiptItems).values(itemRows),
      ]);

      return status(201, { receiptGroupId, transactions: summary });
    },
    { auth: true, body: receiptBatchInput }
  )
  .get(
    "/:id",
    async ({ user, params: { id }, status }) => {
      const [tx] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

      if (!tx) {
        return status(404, { error: "Transaksi tidak ditemukan" });
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

      return {
        ...tx,
        items: items.map((i) => ({ ...i, amount: Number(i.amount) })),
        siblings: siblings.map((s) => ({ ...s, amount: Number(s.amount) })),
      };
    },
    { auth: true }
  )
  .patch(
    "/:id",
    async ({ user, params: { id }, body, status }) => {
      const { amount, note, receiptUrl, ...rest } = body;

      const [row] = await db
        .update(transactions)
        .set({
          ...rest,
          ...(amount !== undefined ? { amount: String(amount) } : {}),
          ...(note !== undefined ? { note: note ?? null } : {}),
          ...(receiptUrl !== undefined
            ? { receiptUrl: receiptUrl ?? null }
            : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
        .returning();

      if (!row) {
        return status(404, { error: "Transaksi tidak ditemukan" });
      }
      return row;
    },
    { auth: true, body: transactionInput.partial() }
  )
  .delete(
    "/:id",
    async ({ user, params: { id }, status }) => {
      const [row] = await db
        .delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
        .returning({ id: transactions.id });

      if (!row) {
        return status(404, { error: "Transaksi tidak ditemukan" });
      }
      return { ok: true };
    },
    { auth: true }
  );
