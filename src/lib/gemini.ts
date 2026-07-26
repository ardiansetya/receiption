import { GoogleGenAI, ThinkingLevel, type ThinkingConfig } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi");
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/* Alias stabil ke model flash-lite terbaru: tier termurah, hemat kuota API. */
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

/*
 * Gemini 3.x memakai thinkingLevel; thinkingBudget hanya valid di Gemini 2.5
 * dan ditolak 400 INVALID_ARGUMENT oleh model Gemini 3.
 * MINIMAL = padanan terdekat thinkingBudget: 0 (latensi & biaya paling rendah).
 */
export const THINKING_MINIMAL: ThinkingConfig = {
  thinkingLevel: ThinkingLevel.MINIMAL,
};

/**
 * Petakan error API Gemini ke status + pesan yang bisa
 * ditampilkan langsung ke pengguna (bukan 500 generik).
 */
/* Status dibuat literal (bukan number) agar Elysia + Eden mengetik respons ini sebagai error. */
export function geminiErrorInfo(err: unknown): {
  status: 429 | 502 | 503;
  error: string;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const code =
    (err as { status?: number })?.status ??
    Number(/"code"\s*:\s*(\d+)/.exec(raw)?.[1] ?? 0);

  if (code === 429) {
    return {
      status: 429,
      error:
        "Kuota AI sedang penuh (limit harian/menit tercapai). Coba lagi beberapa menit, atau besok bila masih gagal.",
    };
  }
  if (code === 503) {
    return {
      status: 503,
      error: "Server AI sedang sibuk. Coba lagi sebentar lagi.",
    };
  }
  if (code === 404) {
    return {
      status: 502,
      error: "Model AI tidak tersedia. Hubungi pengembang.",
    };
  }
  if (raw.includes("GEMINI_API_KEY")) {
    return { status: 503, error: "GEMINI_API_KEY belum dikonfigurasi" };
  }

  console.error("[gemini]", raw);
  return {
    status: 502,
    error: "Layanan AI sedang bermasalah. Coba lagi nanti.",
  };
}
