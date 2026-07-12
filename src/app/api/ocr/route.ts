import { z } from "zod";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { getGemini, GEMINI_MODEL } from "@/lib/gemini";
import {
  checkBurst,
  checkMonthlyQuota,
  refundMonthlyQuota,
  LIMITS,
} from "@/lib/rate-limit";
import { category } from "@/db/schema";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const expenseCategories = category.enumValues.filter((c) => c !== "pemasukan");

const ocrItem = z.object({
  name: z.string(),
  quantity: z.number().int().min(1).catch(1),
  amount: z.number(),
  category: z.enum(category.enumValues),
});

const ocrResult = z.object({
  storeName: z.string(),
  total: z.number(),
  date: z.string().nullable(),
  category: z.enum(category.enumValues),
  isReceipt: z.boolean(),
  items: z.array(ocrItem).catch([]),
});

export type OcrResult = z.infer<typeof ocrResult>;

export const POST = withAuthErrors(async (req: Request) => {
  const user = await requireUser();

  const burst = await checkBurst(
    "ocr",
    user.id,
    LIMITS.ocrBurst.limit,
    LIMITS.ocrBurst.windowSec
  );
  if (!burst.ok) {
    return Response.json({ error: burst.error }, { status: burst.status });
  }

  const quota = await checkMonthlyQuota("ocr", user.id, LIMITS.ocrMonthly);
  if (!quota.ok) {
    return Response.json({ error: quota.error }, { status: quota.status });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "File struk wajib diunggah" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json(
      { error: "Format harus JPG, PNG, WebP, atau HEIC" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Ukuran maksimal 8MB" }, { status: 400 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const ai = getGemini();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: file.type, data: base64 } },
          {
            text: [
              "Baca struk belanja Indonesia pada gambar ini.",
              "Ekstrak: nama toko, total pembayaran (angka rupiah, tanpa titik/koma),",
              "tanggal transaksi (format YYYY-MM-DD, null jika tidak terbaca),",
              "kategori dominan struk, dan DAFTAR SEMUA ITEM baris per baris.",
              "Untuk tiap item: name (nama barang), quantity (jumlah, default 1),",
              "amount (total baris = jumlah x harga satuan, angka rupiah),",
              "dan category paling sesuai untuk BARANG ITU SENDIRI dari:",
              expenseCategories.join(", ") + ".",
              "Contoh: air mineral = minuman, mie instan/roti = makanan, sabun = belanja.",
              "Abaikan baris subtotal, pajak, tunai, dan kembalian.",
              "Set isReceipt=false jika gambar bukan struk/nota pembayaran.",
            ].join(" "),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          storeName: { type: "string" },
          total: { type: "number" },
          date: { type: "string", nullable: true },
          category: { type: "string", enum: expenseCategories },
          isReceipt: { type: "boolean" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                amount: { type: "number" },
                category: { type: "string", enum: expenseCategories },
              },
              required: ["name", "quantity", "amount", "category"],
            },
          },
        },
        required: ["storeName", "total", "category", "isReceipt", "items"],
      },
      temperature: 0,
    },
  });

  let parsed: OcrResult;
  try {
    parsed = ocrResult.parse(JSON.parse(response.text ?? ""));
  } catch {
    await refundMonthlyQuota("ocr", user.id);
    return Response.json(
      { error: "AI gagal membaca struk. Coba foto yang lebih jelas." },
      { status: 422 }
    );
  }

  if (!parsed.isReceipt) {
    await refundMonthlyQuota("ocr", user.id);
    return Response.json(
      { error: "Gambar tidak terdeteksi sebagai struk." },
      { status: 422 }
    );
  }

  const dateValid =
    parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      ? parsed.date
      : new Date().toISOString().slice(0, 10);

  const items = parsed.items
    .filter((i) => i.amount > 0 && i.name.trim().length > 0)
    .map((i) => ({
      name: i.name.trim(),
      quantity: Math.max(Math.round(i.quantity), 1),
      amount: Math.round(Math.abs(i.amount)),
      category: i.category,
    }));

  return Response.json({
    storeName: parsed.storeName,
    total: Math.round(Math.abs(parsed.total)),
    date: dateValid,
    category: parsed.category,
    items,
    quotaRemaining: quota.remaining ?? null,
  });
});
