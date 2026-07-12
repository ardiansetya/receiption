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

/* Alias stabil: selalu menunjuk model flash terbaru yang tersedia untuk API key ini. */
export const GEMINI_MODEL = "gemini-flash-latest";
