# Belajar: Fitur AI di Receiption, dari Awal sampai Akhir

Dokumen ini menjelaskan cara kerja seluruh fitur AI di aplikasi ini: scan struk (OCR), insight keuangan, teknik penghematan token, dan peran Redis. Semua contoh kode diambil langsung dari repo ini, jadi kamu bisa buka filenya dan mencocokkan.

---

## 1. Gambaran Besar

Ada dua fitur yang memanggil AI (Google Gemini):

| Fitur | Endpoint | Tugas AI |
|-------|----------|----------|
| Scan struk | `POST /api/ocr` | Membaca foto struk, mengekstrak nama toko, total, tanggal, dan daftar item beserta kategorinya |
| Insight | `GET /api/insights` | Membuat 4 saran keuangan singkat dari data pengeluaran user |

Alur lengkap scan struk:

```
Foto struk (HP, bisa 4MB)
   │
   ▼  di BROWSER (client)
Kompresi: resize 1280px, JPEG 80%  ──►  file kecil (~100-300KB)
   │
   ▼  upload ke server
POST /api/ocr
   ├─ 1. Cek login (session)
   ├─ 2. Cek burst limit (maks 5x/menit per user)     ← Redis
   ├─ 3. Validasi file (tipe, ukuran)
   ├─ 4. Cek cache hash gambar (pernah discan?)       ← Redis
   ├─ 5. Cek kuota bulanan (30 scan/bulan per user)   ← Redis
   ├─ 6. Panggil Gemini (structured output)
   └─ 7. Simpan hasil ke cache                        ← Redis
   │
   ▼  kembali ke browser
Dialog review: user koreksi kategori per item
   │
   ▼
POST /api/transactions/batch
   └─ item dikelompokkan per kategori,
      disimpan jadi 1 transaksi per kategori + rincian item
```

---

## 2. Klien Gemini — `src/lib/gemini.ts`

Tiga hal penting di file ini:

### a. Lazy initialization

```ts
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
```

**Penjelasan:** klien dibuat sekali lalu disimpan di variabel modul (`client ??= ...` artinya "isi kalau masih null"). Kalau API key belum di-set, kita melempar `Response` 503 yang nanti ditangkap wrapper — jadi error konfigurasi tampil rapi, bukan crash.

### b. Alias model termurah

```ts
export const GEMINI_MODEL = "gemini-flash-lite-latest";
```

**Penjelasan:** `flash-lite` adalah tier termurah Gemini. Kita pakai alias `-latest`, bukan versi spesifik seperti `gemini-2.5-flash`. Pelajaran nyata dari proyek ini: versi spesifik pernah mati mendadak dengan error `"This model ... is no longer available to new users"` — alias tidak akan kena masalah itu.

### c. Menerjemahkan error API jadi pesan manusia

```ts
export function geminiErrorResponse(err: unknown): Response {
  const raw = err instanceof Error ? err.message : String(err);
  const code =
    (err as { status?: number })?.status ??
    Number(/"code"\s*:\s*(\d+)/.exec(raw)?.[1] ?? 0);

  if (code === 429) {
    return Response.json(
      { error: "Kuota AI sedang penuh (limit harian/menit tercapai). ..." },
      { status: 429 }
    );
  }
  if (code === 503) { /* "Server AI sedang sibuk..." */ }
  ...
}
```

**Penjelasan:** tanpa ini, error Gemini (misal kena limit) jatuh ke 500 generik dan user cuma lihat "gagal". Kita baca kode error dari API (429 = limit, 503 = overload) lalu balas dengan pesan yang bisa langsung ditampilkan di toast.

---

## 3. OCR Struk — `src/app/api/ocr/route.ts`

### a. Structured output: memaksa AI menjawab dalam format JSON pasti

Cara paling penting untuk AI yang hasilnya diproses program: **jangan minta teks bebas, minta JSON dengan skema**.

```ts
response = await ai.models.generateContent({
  model: GEMINI_MODEL,
  contents: [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType: file.type, data: base64 } }, // gambar
        { text: "Baca struk belanja Indonesia ini. Ekstrak: ..." }, // instruksi
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
        items: { type: "array", items: { /* name, quantity, amount, category */ } },
      },
      required: ["storeName", "total", "category", "isReceipt", "items"],
    },
    temperature: 0,
    ...
  },
});
```

**Penjelasan:**
- Gambar dikirim sebagai `inlineData` base64 + instruksi teks dalam satu pesan (Gemini multimodal).
- `responseSchema` membuat Gemini **tidak bisa** menjawab di luar format itu. `enum` di `category` memaksa AI memilih hanya dari kategori aplikasi kita — dia tidak bisa mengarang "kategori jajan".
- `temperature: 0` = jawaban deterministik. Untuk ekstraksi data kita mau konsisten, bukan kreatif.
- `isReceipt` adalah trik validasi: kalau user upload foto kucing, AI set `false` dan kita tolak dengan pesan jelas.

### b. Validasi ganda dengan Zod

```ts
const ocrResult = z.object({
  storeName: z.string(),
  total: z.number(),
  date: z.string().nullable(),
  category: z.enum(category.enumValues),
  isReceipt: z.boolean(),
  items: z.array(ocrItem).catch([]),
});

parsed = ocrResult.parse(JSON.parse(response.text ?? ""));
```

**Penjelasan:** meskipun sudah pakai `responseSchema`, output AI tetap divalidasi lagi dengan Zod. Prinsipnya: **jangan pernah percaya output AI mentah-mentah**. `.catch([])` artinya kalau `items` rusak, pakai array kosong alih-alih error total (aplikasi jatuh ke mode satu-transaksi).

### c. Masalah nyata: total nota vs jumlah item

Nota restoran: item Rp119.996 tapi total Rp132.000. Selisihnya pajak + service charge (119.996 x 1,1 = 132.000). Solusi dua lapis:

1. Prompt menyuruh AI: *"Pajak/PPN/PB1/service charge jadi satu item 'Pajak & Layanan'... Jumlah amount semua item HARUS = total"*.
2. Jaring pengaman di UI (`receipt-review-dialog.tsx`): kalau masih selisih, tampil tombol yang menambah item selisih otomatis:

```ts
const diff = data ? data.total - sum : 0;

const addDifferenceItem = () => {
  if (diff <= 0) return;
  setItems((list) => [
    ...list,
    { name: "Pajak & Layanan", quantity: 1, amount: diff, category: dominantCategory },
  ]);
};
```

**Pelajaran:** AI bisa salah. Desain fitur AI yang baik selalu punya jalur koreksi manual untuk user.

---

## 4. Insight AI — `src/app/api/insights/route.ts`

Bedanya dengan OCR: inputnya bukan gambar, tapi **ringkasan data** dari database.

```ts
const dataSummary = {
  bulanIni: thisMonthRows.map((r) => `${label(r.category)}: ${r.total}`),
  bulanLalu: lastMonthRows.map((r) => `${label(r.category)}: ${r.total}`),
  budget: budgetRows.map((b) => `...: budget ${Number(b.amount)}, terpakai ${spent}`),
};
```

**Penjelasan penting untuk hemat token:** kita TIDAK mengirim semua transaksi mentah ke AI. Data diagregasi dulu dengan SQL (`SUM ... GROUP BY category`), jadi yang dikirim cuma belasan baris ringkas seperti `"Makanan: 59000"`. 1000 transaksi atau 10 transaksi, ukuran prompt sama.

Output juga structured (array maksimal 4 insight, masing-masing punya `tone: positive|warning|info`) — `tone` dipakai UI untuk memilih ikon dan warna.

---

## 5. Penghematan Token, Diurutkan dari Dampak Terbesar

Token = satuan biaya AI. Input (gambar + teks) dan output (jawaban) sama-sama dihitung.

### a. Kompres gambar di browser — `src/lib/compress-image.ts`

Token vision Gemini proporsional dengan resolusi gambar (gambar dipotong jadi tile). Foto HP 4000px sangat boros. Solusi: kecilkan SEBELUM di-upload.

```ts
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;

export async function compressReceiptImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(MAX_DIMENSION / Math.max(bitmap.width, bitmap.height), 1);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // gagal decode (mis. HEIC)? kirim asli, jangan bikin fitur mati
  }
}
```

**Penjelasan:** gambar digambar ulang ke `<canvas>` ukuran maks 1280px lalu diexport JPEG kualitas 80%. Teks struk masih terbaca jelas di 1280px. Perhatikan dua fallback: kalau hasil kompres malah lebih besar, atau decode gagal, pakai file asli — **optimasi tidak boleh merusak fitur**.

### b. Matikan "thinking" + batasi output

```ts
config: {
  ...
  maxOutputTokens: 2048,
  thinkingConfig: { thinkingBudget: 0 },
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
}
```

**Penjelasan:**
- Model Gemini flash punya mode "berpikir" internal yang diam-diam membakar token output (yang paling mahal). Untuk tugas ekstraksi terstruktur, thinking tidak menambah akurasi berarti. `thinkingBudget: 0` mematikannya.
- `maxOutputTokens` = pagar maksimal. Kalau AI "ngelantur", biayanya tetap terpotong.
- `mediaResolution: MEDIUM` = Gemini memproses gambar di resolusi lebih rendah lagi di sisi mereka. (LOW terlalu berisiko untuk teks kecil struk.)

### c. Jangan panggil AI kalau jawabannya sudah pernah ada (cache)

Dua cache, dua strategi:

**Cache OCR — key = hash isi gambar:**

```ts
const imageHash = createHash("sha256").update(buffer).digest("hex");
const cacheKey = `ocrcache:${imageHash}`;
if (redis) {
  const cached = await redis.get<OcrResponsePayload>(cacheKey);
  if (cached) {
    return Response.json({ ...cached, quotaRemaining: null, cached: true });
  }
}
```

**Penjelasan:** SHA-256 menghasilkan "sidik jari" unik dari byte file. Foto yang sama persis = hash sama = hasil diambil dari Redis, nol panggilan Gemini, dan kuota user tidak berkurang (cek kuota sengaja ditaruh SETELAH cek cache). Berguna saat user retry atau tidak sengaja menutup dialog.

**Cache insight — key = hash data:**

```ts
const dataHash = createHash("sha256")
  .update(JSON.stringify(dataSummary))
  .digest("hex")
  .slice(0, 16);
const cacheKey = `insights:${user.id}:${month}:${dataHash}`;
```

**Penjelasan:** ini pola yang elegan. Key cache menyertakan hash datanya sendiri, jadi:
- Data tidak berubah = key sama = pakai cache selamanya (TTL 7 hari), buka dashboard 100x = 1 panggilan AI.
- User menambah transaksi = `dataSummary` berubah = hash berubah = key baru = AI dipanggil sekali untuk data baru.
- Tidak perlu logika "hapus cache saat ada transaksi baru" — kadaluarsa terjadi otomatis lewat pergantian key.

### d. Perkecil prompt & input

- Prompt OCR dipadatkan (instruksi digabung, contoh berlebih dihapus).
- Insight mengirim agregat SQL, bukan transaksi mentah (lihat bagian 4).

---

## 6. Redis: Untuk Apa dan Bagaimana

### Kenapa butuh Redis, kenapa Upstash?

Aplikasi ini di-deploy ke Vercel (serverless). Tiap request bisa dilayani "mesin" berbeda yang mati setelah selesai — **variabel di memori tidak bisa dipakai untuk menghitung** ("user ini sudah scan berapa kali?") karena hitungannya hilang/terpisah antar mesin. Butuh penyimpanan cepat yang dibagi semua mesin: Redis. Upstash dipilih karena diakses via HTTP REST (cocok serverless, tanpa koneksi TCP persisten) dan ada tier gratis.

### a. Koneksi dengan degradasi aman — `src/lib/redis.ts`

```ts
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("[redis] ... belum di-set. Rate limit nonaktif.");
    client = null;
    return client;
  }
  client = new Redis({ url: ..., token: ... });
  return client;
}
```

**Penjelasan:** kalau env belum diisi, fungsi mengembalikan `null` dan semua fitur Redis (limit, kuota, cache) otomatis lolos tanpa error. Ini disebut *graceful degradation*: fitur pendukung boleh mati, fitur inti tetap jalan.

### b. Burst limit: sliding window — `src/lib/rate-limit.ts`

Mencegah spam beruntun (misal user menekan tombol scan 20x dalam 10 detik):

```ts
limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`), // mis. 5 per 60 detik
  prefix: `burst:${feature}`,
});

const { success, reset } = await limiter.limit(userId);
if (!success) {
  const waitSec = Math.max(Math.ceil((reset - Date.now()) / 1000), 1);
  return { ok: false, status: 429, error: `Terlalu banyak permintaan. Coba lagi dalam ${waitSec} detik.` };
}
```

**Penjelasan:** *sliding window* menghitung permintaan dalam jendela waktu yang bergeser (60 detik terakhir dari SEKARANG), lebih adil daripada jendela kaku per menit-jam. `limit(userId)` = limit dihitung **per akun**, bukan global. Status HTTP 429 = "Too Many Requests", standar untuk rate limit.

### c. Kuota bulanan: INCR + expire

```ts
const key = `quota:${feature}:${userId}:${currentMonth()}`; // quota:ocr:user123:2026-07
const used = await redis.incr(key);
if (used === 1) {
  await redis.expire(key, 60 * 60 * 24 * 45); // kunci kadaluarsa 45 hari
}
if (used > limit) {
  return { ok: false, status: 429, error: `Kuota scan struk bulan ini habis (30/bulan). ...` };
}
```

**Penjelasan:**
- `INCR` = tambah 1 dan kembalikan nilai baru, **atomik** (dua request bersamaan tidak akan dapat angka sama — Redis yang menjamin, tanpa perlu lock manual).
- Bulan ada di dalam key (`2026-07`), jadi awal bulan depan otomatis mulai dari nol lewat key baru. Key lama dibersihkan `expire`.
- Ada pasangannya, `refundMonthlyQuota` (DECR): kalau Gemini error atau fotonya bukan struk, jatah user dikembalikan — user tidak dihukum untuk kegagalan yang bukan salahnya.

```ts
} catch (err) {
  await refundMonthlyQuota("ocr", user.id);
  return geminiErrorResponse(err);
}
```

### d. Cache dengan TTL

```ts
await redis.set(cacheKey, payload, { ex: OCR_CACHE_TTL_SEC }); // ex = expire detik
```

**Penjelasan:** `ex` membuat data terhapus sendiri setelah waktunya (OCR 24 jam, insight 7 hari). Redis cocok untuk ini karena semua datanya memang dirancang boleh hilang — sumber kebenaran tetap PostgreSQL.

---

## 7. Urutan Cek di /api/ocr (dan alasannya)

```
1. requireUser        → tidak login = 401, jangan buang resource apa pun
2. checkBurst         → murah dicek, tahan spam paling awal
3. validasi file      → tolak file salah sebelum kerja berat
4. cek cache hash     → GRATIS untuk user: tidak kena kuota, tidak panggil AI
5. checkMonthlyQuota  → baru di sini jatah user dipakai
6. panggil Gemini     → bagian mahal
7. simpan cache       → supaya langkah 4 kena untuk foto yang sama
```

Prinsip umumnya: **cek yang murah dulu, yang mahal terakhir**, dan jangan kurangi jatah user sebelum yakin pekerjaan mahal benar-benar akan dilakukan.

---

## 8. Ringkasan Istilah

| Istilah | Arti singkat |
|---------|--------------|
| Token | Satuan biaya AI; potongan kata/gambar yang diproses model |
| Structured output | Memaksa AI menjawab dalam skema JSON pasti (`responseSchema`) |
| Temperature | Tingkat "kreativitas"; 0 = konsisten, cocok untuk ekstraksi data |
| Thinking budget | Jatah token "berpikir" internal model; 0 = mati, hemat |
| Rate limit / burst | Batas frekuensi permintaan dalam jendela waktu pendek |
| Sliding window | Jendela waktu yang bergeser mengikuti waktu sekarang |
| Kuota | Batas total pemakaian per periode (mis. 30 scan/bulan) |
| INCR / DECR | Perintah Redis tambah/kurang 1, atomik |
| TTL / expire | Umur data; setelah lewat, data terhapus sendiri |
| Cache hit / miss | Data ditemukan di cache / tidak ditemukan (harus hitung ulang) |
| Hash (SHA-256) | "Sidik jari" unik dari data; data sama = hash sama |
| Graceful degradation | Fitur pendukung mati tanpa mematikan fitur inti |

---

## 9. File Terkait

| File | Isi |
|------|-----|
| `src/lib/gemini.ts` | Klien Gemini, alias model, pemetaan error |
| `src/lib/compress-image.ts` | Kompresi gambar di browser |
| `src/lib/redis.ts` | Koneksi Upstash + degradasi aman |
| `src/lib/rate-limit.ts` | Burst limit, kuota bulanan, refund |
| `src/app/api/ocr/route.ts` | Pipeline scan struk lengkap |
| `src/app/api/insights/route.ts` | Insight + cache berbasis hash data |
| `src/components/app/receipt-scan-dialog.tsx` | Upload + kompres di client |
| `src/components/app/receipt-review-dialog.tsx` | Review item, koreksi kategori, tombol selisih pajak |
| `src/app/api/transactions/batch/route.ts` | Simpan hasil split per kategori (atomik via `db.batch`) |
