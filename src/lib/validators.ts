import { z } from "zod";
import { category } from "@/db/schema";
import { ME } from "@/lib/split";

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

export const receiptBatchInput = z.object({
  storeName: z.string().trim().min(1, "Nama toko wajib diisi").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Nama item wajib diisi").max(120),
        quantity: z.coerce.number().int().min(1).default(1),
        amount: z.coerce
          .number()
          .int()
          .positive("Nominal item harus lebih dari 0")
          .max(99_999_999_999_999),
        category: z.enum(category.enumValues),
      })
    )
    .min(1, "Minimal satu item"),
});

export type ReceiptBatchInput = z.infer<typeof receiptBatchInput>;

export const splitBillInput = z.object({
  storeName: z.string().trim().min(1, "Nama toko wajib diisi").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  participants: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        name: z.string().trim().min(1, "Nama peserta wajib diisi").max(60),
      })
    )
    .min(1, "Minimal satu peserta selain kamu")
    .max(20, "Maksimal 20 peserta"),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Nama item wajib diisi").max(120),
        quantity: z.coerce.number().int().min(1).default(1),
        amount: z.coerce
          .number()
          .int()
          .positive("Nominal item harus lebih dari 0")
          .max(99_999_999_999_999),
        category: z.enum(category.enumValues),
        shared: z.boolean().default(false),
        assignees: z.array(z.string().min(1).max(64)).default([]),
      })
    )
    .min(1, "Minimal satu item"),
})
  .superRefine((value, ctx) => {
    const ids = new Set(value.participants.map((p) => p.id));
    if (ids.size !== value.participants.length) {
      ctx.addIssue({ code: "custom", message: "Id peserta duplikat" });
    }
    for (const item of value.items) {
      if (item.assignees.some((a) => a !== ME && !ids.has(a))) {
        ctx.addIssue({
          code: "custom",
          message: `Item "${item.name}" ditandai ke peserta yang tidak ada`,
        });
      }
    }
  });

export type SplitBillInput = z.infer<typeof splitBillInput>;

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
