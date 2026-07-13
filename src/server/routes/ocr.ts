import { createHash } from "crypto";
import { Elysia, t } from "elysia";
import { MediaResolution } from "@google/genai";
import { z } from "zod";
import { getGemini, geminiErrorInfo, GEMINI_MODEL } from "@/lib/gemini";
import { getRedis } from "@/lib/redis";
import {
  checkBurst,
  checkMonthlyQuota,
  refundMonthlyQuota,
  LIMITS,
} from "@/lib/rate-limit";
import { category, type Category } from "@/db/schema";
import { authGuard } from "@/server/auth-macro";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const OCR_CACHE_TTL_SEC = 24 * 60 * 60;

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

type OcrResponsePayload = {
  storeName: string;
  total: number;
  date: string;
  category: Category;
  items: {
    name: string;
    quantity: number;
    amount: number;
    category: Category;
  }[];
};

export const ocrRoutes = new Elysia({ prefix: "/ocr" }).use(authGuard).post(
  "/",
  async ({ user, body, status }) => {
    const burst = await checkBurst(
      "ocr",
      user.id,
      LIMITS.ocrBurst.limit,
      LIMITS.ocrBurst.windowSec
    );
    if (!burst.ok) {
      return status(burst.status, { error: burst.error });
    }

    const { file } = body;
    if (!ALLOWED_TYPES.includes(file.type)) {
      return status(400, { error: "Format harus JPG, PNG, WebP, atau HEIC" });
    }
    if (file.size > MAX_SIZE) {
      return status(400, { error: "Ukuran maksimal 8MB" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    /* Dedup: foto sama dalam 24 jam tidak memanggil Gemini dan tidak memakan kuota */
    const redis = getRedis();
    const imageHash = createHash("sha256").update(buffer).digest("hex");
    const cacheKey = `ocrcache:${imageHash}`;
    if (redis) {
      const cached = await redis.get<OcrResponsePayload>(cacheKey);
      if (cached) {
        return { ...cached, quotaRemaining: null as number | null, cached: true };
      }
    }

    const quota = await checkMonthlyQuota("ocr", user.id, LIMITS.ocrMonthly);
    if (!quota.ok) {
      return status(quota.status, { error: quota.error });
    }

    const base64 = buffer.toString("base64");

    let response;
    try {
      response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: file.type, data: base64 } },
              {
                text: [
                  "Baca struk belanja Indonesia ini. Ekstrak: storeName, total pembayaran akhir, date (YYYY-MM-DD, null jika tak terbaca), category dominan, dan items per baris {name, quantity, amount = total baris, category}.",
                  `Pilihan category: ${expenseCategories.join(", ")}.`,
                  "Pajak/PPN/PB1/service charge jadi satu item 'Pajak & Layanan' (category = category dominan). Diskon dikurangkan proporsional ke item terkait, amount tidak boleh negatif. Jumlah amount semua item HARUS = total. Abaikan subtotal, tunai, kembalian.",
                  "isReceipt=false jika bukan struk/nota.",
                ].join("\n"),
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
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        },
      });
    } catch (err) {
      await refundMonthlyQuota("ocr", user.id);
      const info = geminiErrorInfo(err);
      return status(info.status, { error: info.error });
    }

    let parsed: OcrResult;
    try {
      parsed = ocrResult.parse(JSON.parse(response.text ?? ""));
    } catch {
      await refundMonthlyQuota("ocr", user.id);
      return status(422, {
        error: "AI gagal membaca struk. Coba foto yang lebih jelas.",
      });
    }

    if (!parsed.isReceipt) {
      await refundMonthlyQuota("ocr", user.id);
      return status(422, { error: "Gambar tidak terdeteksi sebagai struk." });
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

    const payload: OcrResponsePayload = {
      storeName: parsed.storeName,
      total: Math.round(Math.abs(parsed.total)),
      date: dateValid,
      category: parsed.category,
      items,
    };

    if (redis) {
      await redis.set(cacheKey, payload, { ex: OCR_CACHE_TTL_SEC });
    }

    return {
      ...payload,
      quotaRemaining: (quota.remaining ?? null) as number | null,
      cached: false,
    };
  },
  {
    auth: true,
    body: t.Object({ file: t.File() }),
  }
);
