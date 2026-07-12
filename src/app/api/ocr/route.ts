import { z } from "zod";
import { requireUser, withAuthErrors } from "@/lib/require-user";
import { getGemini, GEMINI_MODEL } from "@/lib/gemini";
import { category } from "@/db/schema";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const ocrResult = z.object({
  storeName: z.string(),
  total: z.number(),
  date: z.string().nullable(),
  category: z.enum(category.enumValues),
  isReceipt: z.boolean(),
});

export type OcrResult = z.infer<typeof ocrResult>;

export const POST = withAuthErrors(async (req: Request) => {
  await requireUser();

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
              "dan tentukan satu kategori paling sesuai dari:",
              category.enumValues.filter((c) => c !== "pemasukan").join(", ") + ".",
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
          category: {
            type: "string",
            enum: category.enumValues.filter((c) => c !== "pemasukan"),
          },
          isReceipt: { type: "boolean" },
        },
        required: ["storeName", "total", "category", "isReceipt"],
      },
      temperature: 0,
    },
  });

  let parsed: OcrResult;
  try {
    parsed = ocrResult.parse(JSON.parse(response.text ?? ""));
  } catch {
    return Response.json(
      { error: "AI gagal membaca struk. Coba foto yang lebih jelas." },
      { status: 422 }
    );
  }

  if (!parsed.isReceipt) {
    return Response.json(
      { error: "Gambar tidak terdeteksi sebagai struk." },
      { status: 422 }
    );
  }

  const dateValid =
    parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      ? parsed.date
      : new Date().toISOString().slice(0, 10);

  return Response.json({
    storeName: parsed.storeName,
    total: Math.round(Math.abs(parsed.total)),
    date: dateValid,
    category: parsed.category,
  });
});
