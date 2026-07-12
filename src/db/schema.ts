import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  numeric,
  uuid,
  date,
  index,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ---------- Enums ---------- */

export const transactionType = pgEnum("transaction_type", [
  "income",
  "expense",
]);

export const transactionSource = pgEnum("transaction_source", [
  "manual",
  "ocr",
]);

export const category = pgEnum("category", [
  "makanan",
  "minuman",
  "transportasi",
  "belanja",
  "hiburan",
  "pendidikan",
  "kesehatan",
  "pemasukan",
  "lainnya",
]);

/* ---------- Better Auth core schema ---------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ---------- Domain: transaksi ---------- */

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: transactionType("type").notNull(),
    category: category("category").notNull(),
    /* IDR, tanpa sen. numeric agar aman untuk agregasi. */
    amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
    title: text("title").notNull(),
    note: text("note"),
    date: date("date").notNull(),
    source: transactionSource("source").notNull().default("manual"),
    receiptUrl: text("receipt_url"),
    /* Menautkan transaksi hasil split dari satu nota yang sama */
    receiptGroupId: uuid("receipt_group_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_user_category_idx").on(t.userId, t.category),
  ]
);

/* ---------- Domain: rincian item nota (hasil OCR) ---------- */

export const receiptItems = pgTable(
  "receipt_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    /* Total baris (qty x harga satuan), IDR tanpa sen */
    amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("receipt_items_transaction_idx").on(t.transactionId)]
);

/* ---------- Domain: budget bulanan per kategori ---------- */

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    category: category("category").notNull(),
    amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
    /* Format YYYY-MM */
    month: text("month").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("budgets_user_category_month_idx").on(
      t.userId,
      t.category,
      t.month
    ),
  ]
);

/* ---------- Domain: target tabungan ---------- */

export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: numeric("target_amount", {
      precision: 14,
      scale: 0,
    }).notNull(),
    savedAmount: numeric("saved_amount", { precision: 14, scale: 0 })
      .notNull()
      .default("0"),
    deadline: date("deadline"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("savings_goals_user_idx").on(t.userId)]
);

export type Transaction = typeof transactions.$inferSelect;
export type ReceiptItem = typeof receiptItems.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type Category = (typeof category.enumValues)[number];
