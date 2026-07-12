import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Response(
      JSON.stringify({ error: "GEMINI_API_KEY belum dikonfigurasi" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/* Alias stabil ke model flash-lite terbaru: tier termurah, hemat kuota API. */
export const GEMINI_MODEL = "gemini-flash-lite-latest";

/**
 * Petakan error API Gemini ke Response dengan pesan yang bisa
 * ditampilkan langsung ke pengguna (bukan 500 generik).
 */
export function geminiErrorResponse(err: unknown): Response {
  const raw = err instanceof Error ? err.message : String(err);
  const code =
    (err as { status?: number })?.status ??
    Number(/"code"\s*:\s*(\d+)/.exec(raw)?.[1] ?? 0);

  if (code === 429) {
    return Response.json(
      {
        error:
          "Kuota AI sedang penuh (limit harian/menit tercapai). Coba lagi beberapa menit, atau besok bila masih gagal.",
      },
      { status: 429 }
    );
  }
  if (code === 503) {
    return Response.json(
      { error: "Server AI sedang sibuk. Coba lagi sebentar lagi." },
      { status: 503 }
    );
  }
  if (code === 404) {
    return Response.json(
      { error: "Model AI tidak tersedia. Hubungi pengembang." },
      { status: 502 }
    );
  }

  console.error("[gemini]", raw);
  return Response.json(
    { error: "Layanan AI sedang bermasalah. Coba lagi nanti." },
    { status: 502 }
  );
}
