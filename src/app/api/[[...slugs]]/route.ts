import { app } from "@/server/app";

/*
 * Semua request /api/* (kecuali /api/auth/* yang lebih spesifik dan
 * tetap ditangani Better Auth) diteruskan ke server Elysia.
 */
export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const PATCH = app.fetch;
export const DELETE = app.fetch;
