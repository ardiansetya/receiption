# Receiption

**Foto struk belanja, transaksi tercatat otomatis.** Aplikasi web pencatat keuangan pribadi berbasis AI untuk mahasiswa dan anak muda Indonesia. Cukup foto struk, dan AI membaca nama toko, total, tanggal, lalu memisahkan setiap item ke kategori yang tepat secara otomatis.

**Live:** https://receiption-nu.vercel.app

---

## Daftar Isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Arsitektur](#arsitektur)
- [Struktur Folder](#struktur-folder)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Environment Variables](#environment-variables)
- [Setup Database](#setup-database)
- [Setup Google OAuth](#setup-google-oauth-opsional)
- [Skrip yang Tersedia](#skrip-yang-tersedia)
- [Skema Database](#skema-database)
- [API Routes](#api-routes)
- [Deployment ke Vercel](#deployment-ke-vercel)
- [Roadmap](#roadmap)

---

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **AI OCR Struk** | Foto struk, AI (Gemini) mengekstrak nama toko, total, tanggal, dan **setiap item beserta kategorinya**. |
| **Split Multi-Kategori** | Satu nota berisi barang campur (minuman + makanan) otomatis dipecah menjadi satu transaksi per kategori, sehingga budget tiap kategori akurat. Rincian item tetap tersimpan dan bisa dilihat. |
| **Transaksi Manual** | Tambah, edit, hapus, dan filter transaksi pemasukan/pengeluaran per bulan dan kategori. |
| **Budget Bulanan** | Tetapkan batas per kategori, pantau progres, dan peringatan saat hampir habis atau melebihi budget. |
| **Statistik** | Donut kategori (palet aman untuk buta warna), arus kas 6 bulan, rata-rata harian, kategori terbesar. |
| **Target Tabungan** | Buat target (mis. "Beli Laptop"), tambah dana bertahap, lihat progres dan deadline. |
| **Insight AI** | Ringkasan actionable dalam Bahasa Indonesia: perbandingan bulan, status budget, saran hemat. |
| **Autentikasi** | Email/password, lupa & reset password, serta Google Login (opsional). |
| **SEO Siap Produksi** | Metadata OG/Twitter, `robots.txt`, `sitemap.xml`, JSON-LD, OG image dinamis, manifest PWA. |

---

## Teknologi

**Frontend**
- [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React Server Components)
- [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) (di atas [Base UI](https://base-ui.com/))
- [TanStack Query](https://tanstack.com/query) — data fetching & cache
- [Motion](https://motion.dev/) — animasi
- [Recharts](https://recharts.org/) — grafik
- [Phosphor Icons](https://phosphoricons.com/)

**Backend**
- Next.js API Routes (Route Handlers)
- [Drizzle ORM](https://orm.drizzle.team/) + [Neon PostgreSQL](https://neon.tech/) (serverless, driver HTTP)
- [Better Auth](https://www.better-auth.com/) — autentikasi
- [Zod](https://zod.dev/) — validasi

**AI**
- [Google Gemini](https://ai.google.dev/) (`@google/genai`, model `gemini-flash-latest`) — OCR struk multimodal + insight, dengan structured output (`responseSchema`)

**Deployment**
- [Vercel](https://vercel.com/) (hosting) + [Neon](https://neon.tech/) (database)

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                     │
│   React 19 + TanStack Query + shadcn/ui + Recharts + Motion │
└───────────────────────────┬─────────────────────────────────┘
                            │ fetch / mutation
┌───────────────────────────▼─────────────────────────────────┐
│                   Next.js App Router (Vercel)               │
│                                                             │
│   Route Handlers  ── Better Auth ── session guard          │
│        │                                                    │
│        ├── /api/ocr, /api/insights ──► Google Gemini       │
│        └── CRUD ──► Drizzle ORM ──► Neon PostgreSQL         │
└─────────────────────────────────────────────────────────────┘
```

- **Route group `(app)`** dilindungi: layout mengecek sesi Better Auth, redirect ke `/login` bila belum masuk.
- **Route group `(auth)`** untuk halaman login/register/reset yang tidak butuh sesi.
- **Landing page** (`/`) statik dan ter-index (SEO), memuat JSON-LD `WebApplication`.
- Karena Neon memakai **driver HTTP** (tanpa transaksi interaktif), penyimpanan hasil scan multi-item memakai `db.batch()` dengan id transaksi yang dibuat di aplikasi agar insert transaksi + item bersifat atomik.

---

## Struktur Folder

```
src/
├── app/
│   ├── (auth)/                  # login, register, forgot/reset password
│   ├── (app)/                   # halaman terproteksi (butuh sesi)
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── stats/
│   │   └── goals/
│   ├── api/                     # Route Handlers (lihat tabel API)
│   ├── layout.tsx               # root layout + metadata SEO
│   ├── page.tsx                 # landing page + JSON-LD
│   ├── robots.ts                # robots.txt
│   ├── sitemap.ts               # sitemap.xml
│   ├── manifest.ts              # manifest PWA
│   ├── icon.tsx                 # favicon dinamis
│   └── opengraph-image.tsx      # OG image dinamis (1200x630)
├── components/
│   ├── landing/                 # navbar, hero, features, pricing, footer
│   ├── app/                     # komponen aplikasi (chart, dialog, sidebar)
│   ├── auth/                    # tombol Google
│   ├── ui/                      # shadcn/ui
│   └── providers.tsx            # QueryClientProvider
├── db/
│   ├── schema.ts                # skema Drizzle
│   └── index.ts                 # koneksi Neon
└── lib/
    ├── auth.ts                  # konfigurasi Better Auth (server)
    ├── auth-client.ts           # client Better Auth
    ├── gemini.ts                # klien Gemini
    ├── validators.ts            # skema Zod
    ├── categories.ts            # label & daftar kategori
    ├── format.ts                # format Rupiah, tanggal, bulan
    └── require-user.ts          # guard sesi untuk API
```

---

## Menjalankan Secara Lokal

### Prasyarat

- [Node.js](https://nodejs.org/) 20 atau lebih baru
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- Akun [Neon](https://neon.tech/) (gratis) untuk PostgreSQL
- API key [Google Gemini](https://aistudio.google.com/apikey) (gratis) untuk OCR & insight

### Langkah

```bash
# 1. Clone
git clone https://github.com/ardiansetya/receiption.git
cd receiption

# 2. Install dependency
pnpm install

# 3. Siapkan environment variables
cp .env.example .env
#   lalu isi .env (lihat tabel di bawah)

# 4. Push skema ke database Neon
pnpm db:push

# 5. Jalankan dev server
pnpm dev
```

Buka http://localhost:3000.

---

## Environment Variables

Salin `.env.example` menjadi `.env` lalu isi:

| Variabel | Wajib | Deskripsi |
|----------|:-----:|-----------|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL dari Neon (`postgresql://...?sslmode=require`). |
| `BETTER_AUTH_SECRET` | ✅ | Secret acak untuk enkripsi sesi. Generate: `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | ✅ | URL dasar aplikasi. Lokal: `http://localhost:3000`. |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL publik untuk metadata SEO & OG image. Lokal: `http://localhost:3000`. |
| `GEMINI_API_KEY` | ✅ | API key Google Gemini untuk OCR struk & insight AI. |
| `GOOGLE_CLIENT_ID` | ⬜ | Client ID Google OAuth (Google Login). Kosongkan untuk menonaktifkan. |
| `GOOGLE_CLIENT_SECRET` | ⬜ | Client Secret Google OAuth. |

> Google Login bersifat opsional. Jika `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` kosong, tombol Google tetap tampil tetapi provider tidak aktif.

---

## Setup Database

Proyek memakai **Drizzle ORM** dengan Neon PostgreSQL.

```bash
# Terapkan skema langsung ke database (development)
pnpm db:push

# Atau, buat file migrasi SQL
pnpm db:generate

# Buka Drizzle Studio (GUI untuk melihat data)
pnpm db:studio
```

Skema didefinisikan di [`src/db/schema.ts`](src/db/schema.ts). Tabel autentikasi (`user`, `session`, `account`, `verification`) mengikuti kebutuhan Better Auth.

---

## Setup Google OAuth (Opsional)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create Credentials** → **OAuth client ID** → **Web application**.
3. Tambahkan **Authorized JavaScript origins**:
   - `http://localhost:3000` (development)
   - `https://<domain-produksi-anda>` (produksi)
4. Tambahkan **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<domain-produksi-anda>/api/auth/callback/google`
5. Salin **Client ID** & **Client Secret** ke `.env` (dan ke Environment Variables Vercel untuk produksi).

> Jika muncul `Error 400: redirect_uri_mismatch`, pastikan redirect URI **sama persis** (protokol, domain, port, path) dengan yang dikirim aplikasi, lalu tunggu 5-10 menit propagasi Google.

---

## Skrip yang Tersedia

| Perintah | Keterangan |
|----------|-----------|
| `pnpm dev` | Jalankan dev server (Turbopack) di port 3000. |
| `pnpm build` | Build produksi. |
| `pnpm start` | Jalankan hasil build produksi. |
| `pnpm lint` | Jalankan ESLint. |
| `pnpm db:push` | Terapkan skema Drizzle ke database. |
| `pnpm db:generate` | Buat file migrasi SQL. |
| `pnpm db:studio` | Buka Drizzle Studio. |

---

## Skema Database

| Tabel | Fungsi |
|-------|--------|
| `user`, `session`, `account`, `verification` | Autentikasi (Better Auth). |
| `transactions` | Transaksi pemasukan/pengeluaran. Kolom `source` (`manual`/`ocr`) dan `receipt_group_id` untuk menautkan hasil split satu nota. |
| `receipt_items` | Rincian item per nota hasil OCR (nama, jumlah, nominal), ditautkan ke `transactions`. |
| `budgets` | Budget per kategori per bulan (unik per user + kategori + bulan). |
| `savings_goals` | Target tabungan (nama, target, terkumpul, deadline). |

Kategori (enum): `makanan`, `minuman`, `transportasi`, `belanja`, `hiburan`, `pendidikan`, `kesehatan`, `pemasukan`, `lainnya`.

---

## API Routes

Semua route (kecuali auth) memerlukan sesi valid.

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `GET/POST` | `/api/auth/[...all]` | Handler Better Auth (login, register, dsb.). |
| `GET` | `/api/summary` | Ringkasan dashboard (saldo, pemasukan/pengeluaran bulan, sisa budget, progres tabungan, seri 6 bulan). |
| `GET/POST` | `/api/transactions` | Daftar (filter bulan/kategori/tipe) & buat transaksi. |
| `GET/PATCH/DELETE` | `/api/transactions/[id]` | Detail (+ rincian item & transaksi lain se-nota), edit, hapus. |
| `POST` | `/api/transactions/batch` | Simpan hasil scan multi-item sebagai transaksi per kategori (atomik). |
| `POST` | `/api/ocr` | Unggah gambar struk → ekstraksi item + kategori via Gemini. |
| `GET/PUT` | `/api/budgets` | Daftar budget bulan + terpakai, dan upsert budget. |
| `DELETE` | `/api/budgets/[id]` | Hapus budget. |
| `GET/POST` | `/api/goals` | Daftar & buat target tabungan. |
| `PATCH/DELETE` | `/api/goals/[id]` | Edit (termasuk tambah dana) & hapus target. |
| `GET` | `/api/stats` | Statistik: per kategori, seri arus kas, rata-rata harian. |
| `GET` | `/api/insights` | Insight AI dari Gemini berdasarkan data pengeluaran. |

---

## Deployment ke Vercel

1. Import repository ke [Vercel](https://vercel.com/new).
2. Tambahkan **Environment Variables** (Production) sesuai tabel di atas. `BETTER_AUTH_URL` dan `NEXT_PUBLIC_APP_URL` diisi domain produksi (mis. `https://receiption-nu.vercel.app`).
3. Deploy. Setiap push ke `master` akan auto-deploy.

> **Catatan:** hindari menyalin nilai env dengan karakter tersembunyi (BOM/whitespace). Nilai `NEXT_PUBLIC_APP_URL` yang kosong/rusak saat build memicu `TypeError: Invalid URL` pada `metadataBase`.

---

## Roadmap

Setelah MVP:

- [ ] Scan beberapa struk sekaligus
- [ ] Export PDF & Excel
- [ ] Pengingat pembayaran tagihan & budget
- [ ] Mode gelap
- [ ] Multi-currency
- [ ] AI Chat Financial Assistant
- [ ] Prediksi pengeluaran bulan berikutnya
- [ ] Penyimpanan foto struk (Supabase Storage / Cloudflare R2)

---

<sub>Dibuat dengan Next.js, Drizzle, Better Auth, dan Google Gemini.</sub>
