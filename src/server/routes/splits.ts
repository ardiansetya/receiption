import { randomUUID } from "crypto";
import { Elysia, t } from "elysia";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  receiptItems,
  splitBillItems,
  splitBills,
  splitParticipants,
  transactions,
} from "@/db/schema";
import { splitBillInput } from "@/lib/validators";
import { computeSplit, ME, type SplitItem } from "@/lib/split";
import { authGuard } from "@/server/auth-macro";
import { buildReceiptBatch } from "@/server/receipt-batch";

/** Pastikan bill milik user yang sedang login. */
async function findBill(id: string, userId: string) {
  const [bill] = await db
    .select()
    .from(splitBills)
    .where(and(eq(splitBills.id, id), eq(splitBills.userId, userId)));
  return bill;
}

export const splitsRoutes = new Elysia({ prefix: "/splits" })
  .use(authGuard)
  /**
   * Simpan tagihan patungan. Pembagian dihitung ulang di server
   * (angka dari client hanya dipakai untuk preview), lalu bill, peserta,
   * rincian, dan transaksi porsi pengguna ditulis dalam satu batch atomik.
   */
  .post(
    "/",
    async ({ user, body, status }) => {
      const { storeName, date, participants, items } = body;

      const split = computeSplit(
        items as SplitItem[],
        participants.map((p) => p.id)
      );

      /* Id lokal dari client dipetakan ke uuid database */
      const dbId = new Map(participants.map((p) => [p.id, randomUUID()]));
      const billId = randomUUID();
      const receiptGroupId = randomUUID();

      const myShare = split.shares.find((s) => s.id === ME);
      const participantShares = participants.map((p) => ({
        input: p,
        share: split.shares.find((s) => s.id === p.id),
      }));

      const participantRows = participantShares.map(({ input, share }) => ({
        id: dbId.get(input.id)!,
        billId,
        name: input.name,
        amount: String(share?.amount ?? 0),
      }));

      const billItemRows = [
        ...(myShare?.items ?? []).map((i) => ({
          billId,
          participantId: null,
          name: i.name,
          amount: String(i.amount),
        })),
        ...participantShares.flatMap(({ input, share }) =>
          (share?.items ?? []).map((i) => ({
            billId,
            participantId: dbId.get(input.id)!,
            name: i.name,
            amount: String(i.amount),
          }))
        ),
      ];

      /* Hanya porsi pengguna yang masuk ledger */
      const note = `Patungan dengan ${participants.map((p) => p.name).join(", ")}`;
      const { txRows, itemRows } = buildReceiptBatch(user.id, {
        storeName,
        date,
        receiptGroupId,
        note,
        items: (myShare?.items ?? []).map((i) => ({
          name: i.name,
          quantity: 1,
          amount: i.amount,
          category: i.category,
        })),
      });

      const ledger =
        txRows.length > 0
          ? [
              db.insert(transactions).values(txRows),
              db.insert(receiptItems).values(itemRows),
            ]
          : [];

      await db.batch([
        db.insert(splitBills).values({
          id: billId,
          userId: user.id,
          title: storeName,
          date,
          totalAmount: String(split.total),
          myAmount: String(split.myAmount),
          receiptGroupId: txRows.length > 0 ? receiptGroupId : null,
        }),
        db.insert(splitParticipants).values(participantRows),
        db.insert(splitBillItems).values(billItemRows),
        ...ledger,
      ]);

      return status(201, {
        id: billId,
        total: split.total,
        myAmount: split.myAmount,
        transactionCount: txRows.length,
      });
    },
    { auth: true, body: splitBillInput }
  )
  .get(
    "/",
    async ({ user }) => {
      const bills = await db
        .select()
        .from(splitBills)
        .where(eq(splitBills.userId, user.id))
        .orderBy(desc(splitBills.date), desc(splitBills.createdAt))
        .limit(100);

      if (bills.length === 0) return { items: [] };

      const people = await db
        .select({
          billId: splitParticipants.billId,
          amount: splitParticipants.amount,
          settledAt: splitParticipants.settledAt,
        })
        .from(splitParticipants)
        .where(
          inArray(
            splitParticipants.billId,
            bills.map((b) => b.id)
          )
        );

      return {
        items: bills.map((b) => {
          const rows = people.filter((p) => p.billId === b.id);
          return {
            id: b.id,
            title: b.title,
            date: b.date,
            totalAmount: Number(b.totalAmount),
            myAmount: Number(b.myAmount),
            participantCount: rows.length,
            settledCount: rows.filter((p) => p.settledAt !== null).length,
            outstanding: rows
              .filter((p) => p.settledAt === null)
              .reduce((s, p) => s + Number(p.amount), 0),
          };
        }),
      };
    },
    { auth: true }
  )
  .get(
    "/:id",
    async ({ user, params: { id }, status }) => {
      const bill = await findBill(id, user.id);
      if (!bill) return status(404, { error: "Tagihan tidak ditemukan" });

      const [people, lines] = await Promise.all([
        db
          .select()
          .from(splitParticipants)
          .where(eq(splitParticipants.billId, id)),
        db.select().from(splitBillItems).where(eq(splitBillItems.billId, id)),
      ]);

      const itemsOf = (participantId: string | null) =>
        lines
          .filter((l) => l.participantId === participantId)
          .map((l) => ({ name: l.name, amount: Number(l.amount) }));

      return {
        id: bill.id,
        title: bill.title,
        date: bill.date,
        totalAmount: Number(bill.totalAmount),
        myAmount: Number(bill.myAmount),
        myItems: itemsOf(null),
        participants: people.map((p) => ({
          id: p.id,
          name: p.name,
          amount: Number(p.amount),
          settledAt: p.settledAt,
          items: itemsOf(p.id),
        })),
      };
    },
    { auth: true }
  )
  .patch(
    "/:id/participants/:participantId",
    async ({ user, params: { id, participantId }, body, status }) => {
      const bill = await findBill(id, user.id);
      if (!bill) return status(404, { error: "Tagihan tidak ditemukan" });

      const [row] = await db
        .update(splitParticipants)
        .set({ settledAt: body.settled ? new Date() : null })
        .where(
          and(
            eq(splitParticipants.id, participantId),
            eq(splitParticipants.billId, id)
          )
        )
        .returning();

      if (!row) return status(404, { error: "Peserta tidak ditemukan" });
      return { id: row.id, settledAt: row.settledAt };
    },
    { auth: true, body: t.Object({ settled: t.Boolean() }) }
  )
  /* Menghapus tagihan tidak menghapus transaksi porsi pengguna di ledger. */
  .delete(
    "/:id",
    async ({ user, params: { id }, status }) => {
      const [row] = await db
        .delete(splitBills)
        .where(and(eq(splitBills.id, id), eq(splitBills.userId, user.id)))
        .returning({ id: splitBills.id });

      if (!row) return status(404, { error: "Tagihan tidak ditemukan" });
      return { ok: true };
    },
    { auth: true }
  );
