/**
 * Kompres foto struk di client sebelum upload:
 * resize sisi terpanjang ke 1280px + JPEG 0.8.
 * Token vision Gemini proporsional resolusi, jadi ini
 * penghemat token terbesar. Gagal decode (mis. HEIC di
 * browser tanpa dukungan) jatuh kembali ke file asli.
 */
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;

export async function compressReceiptImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
      1
    );

    /* Sudah kecil dan bukan format berat: kirim apa adanya */
    if (scale === 1 && file.size < 500_000) {
      bitmap.close();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}
