import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, category as categoryEnum } from "@/db/schema";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { transactionInput } from "@/lib/validators";

export const GET = withAuthErrors(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);

  const month = url.searchParams.get("month");
  const cat = url.searchParams.get("category");
  const type = url.searchParams.get("type");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const conditions = [eq(transactions.userId, user.id)];

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    conditions.push(
      gte(transactions.date, `${month}-01`),
      lte(transactions.date, end)
    );
  }
  if (
    cat &&
    (categoryEnum.enumValues as readonly string[]).includes(cat)
  ) {
    conditions.push(
      eq(transactions.category, cat as (typeof categoryEnum.enumValues)[number])
    );
  }
  if (type === "income" || type === "expense") {
    conditions.push(eq(transactions.type, type));
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(where),
  ]);

  return Response.json({
    items: rows,
    total: Number(countRows[0]?.count ?? 0),
  });
});

export const POST = withAuthErrors(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = transactionInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(transactions)
    .values({
      userId: user.id,
      type: parsed.data.type,
      category: parsed.data.category,
      amount: String(parsed.data.amount),
      title: parsed.data.title,
      note: parsed.data.note ?? null,
      date: parsed.data.date,
      source: parsed.data.source,
      receiptUrl: parsed.data.receiptUrl ?? null,
    })
    .returning();

  return Response.json(row, { status: 201 });
});
