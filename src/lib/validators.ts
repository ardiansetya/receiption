import { z } from "zod";
import { category } from "@/db/schema";

export const transactionInput = z.object({
  type: z.enum(["income", "expense"]),
  category: z.enum(category.enumValues),
  amount: z.coerce
    .number()
    .int("Nominal harus bilangan bulat")
    .positive("Nominal harus lebih dari 0")
    .max(99_999_999_999_999, "Nominal terlalu besar"),
  title: z.string().trim().min(1, "Judul wajib diisi").max(120),
  note: z.string().trim().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  source: z.enum(["manual", "ocr"]).default("manual"),
  receiptUrl: z.string().url().optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionInput>;

export const budgetInput = z.object({
  category: z.enum(category.enumValues),
  amount: z.coerce.number().int().positive().max(99_999_999_999_999),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const goalInput = z.object({
  name: z.string().trim().min(1, "Nama target wajib diisi").max(120),
  targetAmount: z.coerce.number().int().positive().max(99_999_999_999_999),
  savedAmount: z.coerce
    .number()
    .int()
    .min(0)
    .max(99_999_999_999_999)
    .default(0),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});
