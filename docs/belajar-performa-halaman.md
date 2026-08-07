# Belajar: Kenapa Halaman Lama Terbuka, dan Cara Memperbaikinya

Dokumen ini menjelaskan penyebab halaman lambat, cara mengenalinya, dan cara memperbaikinya. Semua contoh diambil dari repo ini — kamu bisa membuka filenya dan mencocokkan. Kasus nyatanya: LCP halaman `/dashboard` dan `/transactions` sempat ~6 detik di Vercel Speed Insights.

---

## 1. Dulu: Metrik Apa yang Sebenarnya Diukur

Speed Insights menampilkan beberapa angka. Yang paling sering jadi masalah:

| Metrik | Arti sederhana | Target bagus |
|--------|----------------|--------------|
| **TTFB** (Time to First Byte) | Berapa lama server mulai mengirim balasan | < 800 ms |
| **FCP** (First Contentful Paint) | Kapan piksel pertama yang berarti muncul | < 1,8 detik |
| **LCP** (Largest Contentful Paint) | Kapan elemen **terbesar** di layar selesai tampil | < 2,5 detik |
| **CLS** (Cumulative Layout Shift) | Seberapa sering isi halaman "lompat" | < 0,1 |
| **INP** (Interaction to Next Paint) | Seberapa cepat halaman merespons klik | < 200 ms |

### Yang penting dipahami soal LCP

LCP mengukur **elemen terbesar yang punya isi**: blok teks, gambar, atau video. Kotak abu-abu kosong (skeleton) **tidak dihitung** karena tidak punya isi.

Konsekuensinya penting sekali:

> Kalau halamanmu awalnya cuma skeleton, lalu angka aslinya baru muncul 5 detik kemudian, maka **LCP kamu 5 detik** — bukan 0,5 detik saat skeleton muncul.

Inilah yang terjadi di dashboard ini. Skeleton tampil cepat, tapi kartu "Total Saldo" yang berisi angka besar baru terisi jauh setelahnya. Elemen itulah yang dicatat sebagai LCP.

**Pelajaran pertama:** memasang skeleton membuat halaman *terasa* cepat, tapi tidak membuat LCP jadi bagus. LCP baru membaik kalau **isi aslinya** datang lebih cepat.

---

## 2. Anatomi: Apa yang Terjadi dari Klik sampai Terlihat

Sebelum memperbaiki, kamu harus bisa membayangkan urutannya. Ini rantai yang terjadi di aplikasi Next.js dengan data diambil di client (kondisi awal repo ini):

```
User klik /dashboard
  │
  ├─ 1. Server Vercel bangun (cold start kalau sedang idle)      ~200-800 ms
  ├─ 2. Layout jalan: cek sesi login  ──► query ke database      ~100-300 ms
  ├─ 3. HTML dikirim  ──► ISINYA CUMA SKELETON                   ← TTFB selesai
  │
  ├─ 4. Browser unduh CSS + JavaScript                           ~300-1500 ms
  ├─ 5. Browser eksekusi JS, React hidrasi                       ~200-800 ms
  │
  ├─ 6. useQuery jalan ──► fetch /api/summary
  │      ├─ server bangun lagi (fungsi berbeda)
  │      ├─ cek sesi login ──► query database LAGI
  │      └─ 5 query database BERURUTAN                           ~500-2000 ms
  │
  └─ 7. Angka muncul  ──────────────────────────────────► LCP DICATAT DI SINI
```

Perhatikan bentuknya: semuanya **berbaris**, tidak ada yang berjalan bersamaan. Langkah 6 tidak bisa mulai sebelum langkah 5 selesai, dan langkah 5 tidak bisa mulai sebelum langkah 4 selesai. Ini namanya **waterfall** (air terjun) — dan setiap anak tangga menambah waktu ke LCP.

Kalau tiap langkah kena angka jelek sedikit-sedikit, totalnya gampang tembus 6 detik. Tidak ada satu bagian yang "rusak parah"; yang salah adalah **bentuk rantainya**.

---

## 3. Daftar Penyebab Halaman Lambat

Ini pengelompokan yang berguna dipakai berulang kali, bukan cuma untuk proyek ini.

### A. Server lambat menjawab (TTFB tinggi)

| Penyebab | Kenapa lambat | Ciri-ciri |
|----------|---------------|-----------|
| **Query database berurutan** | Tiap `await` menunggu yang sebelumnya selesai. 5 query × 150 ms = 750 ms, padahal bisa 150 ms | Banyak `await` beruntun di satu fungsi |
| **Query N+1** | Ambil 50 baris, lalu 50 query lagi untuk tiap baris | Query di dalam `for`/`map` |
| **Cold start** | Fungsi serverless mati saat idle, harus dinyalakan lagi | Kunjungan pertama lambat, berikutnya cepat |
| **Database jauh dari server** | Server di Singapura, database di Amerika = ~200 ms per query | Semua query pelan padahal sederhana |
| **Query tanpa index** | Database memindai seluruh tabel | Makin lambat seiring data bertambah |
| **Cek sesi berulang** | Layout cek login, lalu page cek lagi, lalu API cek lagi | Tiga query sesi untuk satu kunjungan |

### B. Data baru diambil setelah halaman jalan di browser

Ini **penyebab terbesar** di proyek ini.

Kalau data diambil dengan `useQuery`/`useEffect` di client, urutannya wajib: HTML → unduh JS → hidrasi → baru fetch. Fetch-nya sendiri mungkin cuma 300 ms, tapi dia baru boleh mulai setelah semua langkah sebelumnya beres.

Padahal server sudah punya akses langsung ke database. Kenapa harus browser yang minta, lewat perjalanan bolak-balik ekstra?

| Pola | Kapan data siap |
|------|-----------------|
| Fetch di client (`useQuery` saja) | Setelah JS diunduh + dijalankan + satu request lagi |
| Fetch di server, kirim bersama HTML | Bersamaan dengan HTML — nol request tambahan |

### C. JavaScript terlalu besar

Browser harus **mengunduh**, **mem-parse**, lalu **menjalankan** JS sebelum React bisa menampilkan apa pun yang bergantung padanya. Di HP kelas menengah dengan jaringan 4G, ini bisa memakan detik-detikan.

| Penyebab | Contoh nyata |
|----------|--------------|
| **Barrel import** | `import { Plus } from "@phosphor-icons/react"` bisa menarik ribuan modul ikon kalau bundler tidak diberi tahu cara memangkasnya |
| **Library berat yang tidak langsung terlihat** | `recharts` (grafik) ~100 KB, padahal grafiknya ada di bawah dan bukan elemen LCP |
| **Library global yang tidak semua halaman butuh** | `lenis` + `motion` untuk smooth scroll dipasang di root layout, jadi ikut terunduh di halaman aplikasi yang tidak butuh |
| **Komponen dialog/modal yang jarang dibuka** | Semua dialog ikut di-bundle meski user jarang membukanya |

### D. Aset render-blocking

| Penyebab | Efek |
|----------|------|
| Font dari CDN luar | Browser tunggu font sebelum menggambar teks |
| CSS besar tanpa dipecah | Render tertahan sampai CSS selesai |
| Gambar hero tanpa ukuran/prioritas | LCP jadi gambar yang telat dimuat |

Di repo ini bagian D relatif sudah aman: `next/font/google` sudah menyajikan font dari domain sendiri (self-hosted), dan Tailwind memangkas CSS yang tidak dipakai.

### E. Salah menentukan elemen LCP

Kadang elemen terbesar bukan yang kamu kira. Grafik besar, gambar banner, atau blok teks panjang bisa jadi LCP. Kalau elemen itu dimuat belakangan (lazy load), LCP ikut mundur. Aturannya: **jangan pernah lazy-load elemen yang jadi LCP**, dan sebaliknya, **lazy-load yang bukan LCP**.

---

## 4. Kasus Nyata di Repo Ini: Sebelum dan Sesudah

### Masalah 1 — Lima query database berbaris

**Sebelum** (`src/server/routes/summary.ts`):

```ts
const totals = await db.select()...        // tunggu ~150 ms
const monthTotals = await db.select()...   // tunggu ~150 ms
const monthBudgets = await db.select()...  // tunggu ~150 ms
const goalRows = await db.select()...      // tunggu ~150 ms
const seriesRows = await db.select()...    // tunggu ~150 ms
// total ~750 ms
```

Kelima query ini **tidak saling bergantung**. Query kedua tidak butuh hasil query pertama. Jadi menunggunya satu-satu murni pemborosan.

**Sesudah** ([`src/server/data/summary.ts`](../src/server/data/summary.ts)):

```ts
const [totals, monthTotals, monthBudgets, spentRows, goalRows, seriesRows] =
  await Promise.all([
    db.select()...,
    db.select()...,
    db.select()...,
    db.select()...,
    db.select()...,
    db.select()...,
  ]);
// total ~150 ms — selambat query paling lambat, bukan jumlah semuanya
```

`Promise.all` menjalankan semuanya bersamaan lalu menunggu semuanya selesai. Waktu totalnya jadi selambat **satu** query terlambat, bukan penjumlahan.

> **Kapan boleh `Promise.all`?** Kalau query B tidak butuh hasil query A. Kalau butuh (misalnya ambil user dulu baru ambil transaksinya), memang harus berurutan.

Ada satu penyesuaian kecil. Dulu query "pengeluaran per kategori" hanya dijalankan kalau user punya budget:

```ts
if (monthBudgets.length > 0) {
  const spentRows = await db.select()...  // butuh hasil query sebelumnya
}
```

Kondisi ini memaksa urutan. Solusinya: jalankan saja query itu selalu (biayanya kecil), lalu saring hasilnya di JavaScript:

```ts
const budgetSpent =
  monthBudgets.length > 0
    ? spentRows.filter((r) => budgeted.has(r.category)).reduce(...)
    : 0;
```

Menukar "satu query yang kadang tidak perlu" dengan "hilangnya satu anak tangga waterfall" itu pertukaran yang menguntungkan.

### Masalah 2 — Data baru diambil setelah hidrasi

Ini perbaikan dengan dampak terbesar.

**Sebelum** — `dashboard/page.tsx` adalah Client Component:

```tsx
"use client";

export default function DashboardPage() {
  const { data, isPending } = useQuery({
    queryKey: ["summary"],
    queryFn: fetchSummary,   // baru jalan setelah JS diunduh + hidrasi
  });

  if (isPending) return <Skeleton />;   // ← yang dilihat user 5 detik pertama
  return <div>{formatIDR(data.balance)}</div>;
}
```

**Sesudah** — dipecah dua. Server Component mengambil data lebih dulu, Client Component tetap mengurus interaksi:

[`src/app/(app)/dashboard/page.tsx`](<../src/app/(app)/dashboard/page.tsx>) — berjalan di server:

```tsx
export default async function DashboardPage() {
  const user = await getUser();
  const queryClient = new QueryClient();

  if (user) {
    await queryClient.prefetchQuery({
      queryKey: ["summary"],
      queryFn: () => getSummaryData(user.id, currentMonth()),  // langsung ke database
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
```

[`dashboard-client.tsx`](<../src/app/(app)/dashboard/dashboard-client.tsx>) — tidak berubah sama sekali:

```tsx
"use client";

export function DashboardClient() {
  const { data, isPending } = useQuery({
    queryKey: ["summary"],   // kunci SAMA PERSIS dengan yang di-prefetch
    queryFn: fetchSummary,
  });
  ...
}
```

**Cara kerjanya:**

1. Server mengambil data langsung dari database (tanpa lewat HTTP — server ini memang sudah di sebelah database).
2. `dehydrate()` mengubah isi cache React Query jadi data biasa yang bisa dikirim.
3. Data itu ikut terkirim bersama HTML.
4. `HydrationBoundary` menuangkan data itu ke cache React Query di browser **sebelum** komponen dirender.
5. `useQuery` di client langsung menemukan datanya sudah ada. `isPending` bernilai `false` sejak render pertama. Skeleton tidak pernah muncul, dan tidak ada request tambahan.

Rantai barunya jadi:

```
User klik /dashboard
  ├─ 1. Server bangun
  ├─ 2. Cek sesi + ambil semua data (paralel)                    ~300 ms
  ├─ 3. HTML dikirim ──► SUDAH BERISI ANGKA ASLINYA
  └─ 4. Browser menggambar teks  ─────────────────────► LCP DICATAT DI SINI
```

Langkah "unduh JS → hidrasi → fetch lagi" hilang dari jalur LCP. JS tetap diunduh (untuk tombol, dialog, filter), tapi LCP **tidak lagi menunggunya**.

> **Kenapa tidak sekalian buang React Query saja dan pakai data server langsung?**
> Karena halaman ini tetap butuh refetch setelah user menambah/menghapus transaksi (`invalidateQueries`). Pola prefetch + hydrate memberi keduanya: render pertama instan dari server, pembaruan berikutnya tetap ditangani React Query.

**Syarat mutlak:** `queryKey` di server harus **sama persis** dengan yang di client. Beda sedikit — misalnya `["summary"]` vs `["summary", month]` — maka client menganggapnya query lain dan tetap menembak API. Ini kesalahan paling sering terjadi pada pola ini.

### Masalah 3 — Logika ditulis dua kali

Kalau server dan API sama-sama butuh logika yang sama, jangan disalin. Nanti berbeda diam-diam saat salah satunya diubah.

Solusinya: pindahkan ke satu fungsi bersama, lalu dipakai keduanya.

```
src/server/data/summary.ts   ← logika query, satu-satunya sumber kebenaran
        │
        ├──► src/server/routes/summary.ts    (dipakai /api/summary)
        └──► src/app/(app)/dashboard/page.tsx (dipakai prefetch server)
```

Route API-nya jadi tipis sekali:

```ts
.get("/", ({ user, query }) => getSummaryData(user.id, query.month ?? currentMonth()),
   { auth: true, query: monthQuery })
```

### Masalah 4 — Cek sesi berkali-kali dalam satu kunjungan

`layout.tsx` memanggil `getUser()`, lalu `page.tsx` memanggil `getUser()` lagi. Dua query database untuk hal yang sama persis.

**Sesudah** ([`src/lib/require-user.ts`](../src/lib/require-user.ts)):

```ts
import { cache } from "react";

export const getUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});
```

`cache()` dari React membuat fungsi ini **hanya berjalan sekali per request**. Panggilan kedua, ketiga, dan seterusnya mengembalikan hasil yang sama tanpa menyentuh database lagi. Cache-nya otomatis hilang saat request selesai, jadi user lain tidak mungkin kebagian data user lain.

### Masalah 5 — Grafik ikut dibundel padahal bukan LCP

`recharts` cukup berat dan grafiknya ada di bawah kartu-kartu angka — jelas bukan elemen LCP.

```tsx
const ExpenseChart = dynamic(
  () => import("@/components/app/expense-chart").then((m) => m.ExpenseChart),
  { ssr: false, loading: () => <Skeleton className="h-55 w-full rounded-lg" /> }
);
```

Sekarang recharts diunduh sebagai berkas terpisah, **setelah** halaman utama tampil. Yang penting muncul duluan; yang bisa menyusul, menyusul.

Ingat aturannya: ini aman justru **karena** grafik bukan elemen LCP. Kalau kamu lazy-load gambar hero yang jadi LCP, hasilnya malah kebalikannya.

### Masalah 6 — Library yang tidak semua halaman butuh

`SmoothScroll` (lenis + motion) dipasang di root layout, membungkus **semua** halaman. Padahal smooth scroll hanya masuk akal di landing page yang panjang — bukan di dashboard.

**Sebelum** (`src/app/layout.tsx`):

```tsx
<body>
  <SmoothScroll>{children}</SmoothScroll>   {/* semua rute ikut kena */}
</body>
```

**Sesudah** — root layout bersih, landing page yang membungkus dirinya sendiri:

```tsx
// src/app/page.tsx (landing saja)
export default function Home() {
  return (
    <SmoothScroll>
      <main>...</main>
    </SmoothScroll>
  );
}
```

Impor CSS-nya ikut pindah ke dalam komponennya sendiri, supaya tidak ada yang tertinggal di rute lain.

### Masalah 7 — Barrel import ikon

```ts
import { Plus, Camera, Trash } from "@phosphor-icons/react";
```

Baris ini terlihat cuma minta tiga ikon, tapi `@phosphor-icons/react` mengekspor ribuan modul dari satu berkas index. Tanpa bantuan, bundler bisa ikut memproses semuanya.

[`next.config.ts`](../next.config.ts):

```ts
experimental: {
  optimizePackageImports: ["@phosphor-icons/react"],
}
```

Next lalu menulis ulang impornya jadi impor langsung ke berkas ikon yang benar-benar dipakai. `recharts` tidak perlu ditulis karena sudah dioptimalkan Next secara bawaan — daftar lengkapnya ada di `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/optimizePackageImports.md`.

---

## 5. Ringkasan Perbaikan

| Penyebab | Perbaikan | Dampak ke LCP |
|----------|-----------|---------------|
| Data diambil setelah hidrasi | Prefetch di Server Component + `HydrationBoundary` | **Terbesar** — memotong satu putaran jaringan penuh |
| 5 query database berurutan | `Promise.all` | Besar — TTFB turun |
| Cek sesi berulang | `cache()` dari React | Sedang |
| recharts di bundle awal | `next/dynamic` dengan `ssr: false` | Sedang |
| lenis + motion di semua rute | Pindah ke landing saja | Sedang |
| Barrel import ikon | `optimizePackageImports` | Kecil–sedang |

---

## 6. Pertukaran yang Perlu Disadari

Tidak ada perbaikan yang gratis. Yang perlu kamu tahu:

**TTFB naik sedikit, LCP turun banyak.** Sekarang server mengambil data dulu sebelum mengirim HTML, jadi byte pertama datang lebih lambat. Tapi pekerjaan itu memang harus dilakukan — bedanya sekarang dikerjakan di tempat yang dekat dengan database (~5 ms per query), bukan dari browser user yang harus bolak-balik lewat internet. Total waktunya jauh lebih pendek.

**Halaman jadi dua berkas.** `page.tsx` (server) dan `*-client.tsx` (client). Sedikit lebih banyak berkas, tapi batasnya jadi jelas: server untuk mengambil data, client untuk interaksi.

**`queryKey` jadi kontrak.** Server dan client harus memakai kunci yang sama persis. Kalau berubah di satu sisi saja, prefetch-nya terbuang percuma dan kamu tidak akan mendapat pesan error apa pun — halamannya cuma diam-diam jadi lambat lagi. Ini kenapa di [`transactions/page.tsx`](<../src/app/(app)/transactions/page.tsx>) ada komentar yang menyebutkan filter defaultnya.

---

## 7. Cara Mendiagnosis Sendiri

Urutan yang berguna dipakai lain kali:

**1. Chrome DevTools → tab Performance**

Rekam saat memuat halaman. Cari penanda `LCP` di timeline, lalu klik. Chrome akan menunjukkan **elemen mana** yang jadi LCP. Sering kali hasilnya mengejutkan.

**2. Chrome DevTools → tab Network**

Aktifkan throttling "Fast 4G". Perhatikan bentuk grafiknya:
- Batang-batang bertangga turun (seperti tangga) = **waterfall**, ada yang saling menunggu
- Batang-batang mulai berbarengan = sudah paralel, bagus

Cari request yang baru mulai jauh setelah halaman dimuat — itu biasanya fetch dari client yang bisa dipindah ke server.

**3. Output `next build`**

Lihat kolom ukuran bundle per rute. Rute yang jauh lebih besar dari tetangganya biasanya menyeret library berat.

**4. Ukur query database**

Bungkus dengan waktu untuk melihat mana yang lambat:

```ts
console.time("summary");
const data = await getSummaryData(userId, month);
console.timeEnd("summary");
```

**5. Speed Insights di Vercel**

Ini data lapangan dari user asli, bukan simulasi. Angkanya butuh beberapa hari kunjungan untuk stabil, jadi jangan panik kalau setelah deploy angkanya belum langsung berubah — yang lama masih ikut dirata-rata.

---

## 8. Checklist untuk Halaman Baru

Sebelum menganggap sebuah halaman selesai:

- [ ] Data yang tampil saat halaman dibuka pertama kali, apakah diambil di server?
- [ ] Ada `await` beruntun yang sebenarnya tidak saling bergantung? Jadikan `Promise.all`.
- [ ] Ada query di dalam `for` atau `map`? Itu N+1 — gabungkan jadi satu query.
- [ ] Elemen apa yang jadi LCP? Pastikan **tidak** di-lazy-load.
- [ ] Komponen berat yang ada di bawah layar (grafik, peta, editor) — sudah `dynamic`?
- [ ] Library yang cuma dipakai satu halaman — apakah masih nyangkut di root layout?
- [ ] Kolom yang dipakai untuk filter dan urutan — sudah punya index di database?
- [ ] `queryKey` prefetch server sama persis dengan yang di client?

---

## 9. Bacaan Lanjutan

- `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` — pola pengambilan data di App Router
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` — `next/dynamic` dan kapan memakainya
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/optimizePackageImports.md` — daftar library yang sudah dioptimalkan bawaan
- [web.dev/lcp](https://web.dev/articles/lcp) — cara LCP dihitung dan elemen apa saja yang dihitung
