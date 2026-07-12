# Product Planning — Receiption

## Deskripsi Produk

Receiption adalah aplikasi SaaS berbasis web yang membantu pengguna perorangan mengelola keuangan pribadi dengan cara yang sederhana dan praktis. Fokus utama aplikasi adalah memudahkan pencatatan pengeluaran melalui teknologi AI dan OCR, sehingga pengguna hanya perlu memotret struk belanja dan seluruh data transaksi akan tercatat secara otomatis.

Produk ini dirancang khusus untuk pengguna yang belum terbiasa melakukan pencatatan keuangan secara konsisten, terutama mahasiswa dan kalangan muda yang ingin mulai membangun kebiasaan mengelola uang.

---

# Target Pengguna

Fokus utama aplikasi adalah pengguna perorangan, bukan perusahaan atau UMKM.

### Persona Utama

#### 1. Mahasiswa

Karakteristik:

* Memiliki uang saku bulanan.
* Sulit mengetahui ke mana uang mereka habis.
* Jarang mencatat pengeluaran.
* Ingin belajar mengatur keuangan.

Kebutuhan:

* Mengetahui sisa uang bulanan.
* Melihat kategori pengeluaran terbesar.
* Mendapatkan pengingat ketika pengeluaran mulai berlebihan.
* Membangun kebiasaan finansial yang baik.

---

#### 2. Fresh Graduate

Karakteristik:

* Baru memiliki penghasilan.
* Ingin mulai menabung.
* Belum memiliki sistem pencatatan keuangan.

Kebutuhan:

* Melihat cash flow pribadi.
* Menentukan target tabungan.
* Mengetahui kebiasaan pengeluaran.

---

#### 3. Karyawan Muda

Karakteristik:

* Memiliki penghasilan tetap.
* Sering membeli makanan, transportasi, dan hiburan.
* Tidak memiliki waktu mencatat transaksi satu per satu.

Kebutuhan:

* Pencatatan otomatis.
* Laporan bulanan.
* Insight pengeluaran.

---

# Tujuan Produk

Membantu pengguna memahami kondisi keuangan mereka tanpa harus melakukan pencatatan secara manual.

Aplikasi harus mampu menjawab pertanyaan seperti:

* Uang saya habis untuk apa saja bulan ini?
* Berapa pengeluaran terbesar saya?
* Apakah saya masih sesuai dengan budget?
* Berapa uang yang berhasil saya tabung?
* Berapa rata-rata pengeluaran harian saya?

---

# Nilai Jual Utama

Receiption bukan sekadar aplikasi pencatat keuangan.

Keunggulan utamanya adalah:

* Foto struk → transaksi otomatis tercatat.
* AI mengategorikan transaksi secara otomatis.
* Dashboard sederhana dan mudah dipahami.
* Membantu membangun kebiasaan finansial.

Fokus utama adalah pengalaman pengguna yang cepat, ringan, dan minim input manual.

---

# Fitur MVP (Versi Pertama)

## Authentication

* Login
* Register
* Forgot Password
* Google Login

---

## Dashboard

Menampilkan ringkasan keuangan:

* Total saldo
* Total pemasukan bulan ini
* Total pengeluaran bulan ini
* Sisa budget
* Progress tabungan
* Grafik pengeluaran bulanan

---

## Pencatatan Transaksi

Pengguna dapat:

* Menambah transaksi manual
* Mengunggah foto struk
* Mengedit hasil OCR jika diperlukan
* Menghapus transaksi
* Melihat riwayat transaksi

---

## AI OCR Receipt

Setelah pengguna mengunggah foto struk:

AI membaca:

* Nama toko
* Total pembayaran
* Tanggal transaksi

Kemudian AI memberikan kategori otomatis seperti:

* Makanan
* Minuman
* Transportasi
* Belanja
* Hiburan
* Pendidikan
* Kesehatan
* Lainnya

Pengguna tetap dapat mengubah kategori jika diperlukan.

---

## Budget Bulanan

Pengguna dapat membuat budget untuk setiap kategori.

Contoh:

Makanan : Rp1.000.000

Transportasi : Rp500.000

Hiburan : Rp400.000

Dashboard akan menunjukkan progress penggunaan budget.

---

## Statistik

Dashboard analitik meliputi:

* Pie Chart kategori pengeluaran
* Grafik pengeluaran bulanan
* Grafik pemasukan
* Top kategori pengeluaran
* Rata-rata pengeluaran harian

---

## Target Tabungan

Pengguna dapat membuat target seperti:

"Beli Laptop"

Target:
Rp15.000.000

Deadline:
1 Januari 2027

Dashboard menampilkan progress pencapaian target.

---

## Insight AI

AI akan memberikan ringkasan seperti:

* Pengeluaran makanan meningkat 25% dibanding bulan lalu.
* Pengeluaran transportasi menurun.
* Anda berpotensi menghemat Rp500.000 jika mengurangi pengeluaran hiburan.
* Budget makanan hampir habis.

Insight harus singkat, mudah dipahami, dan memberikan saran yang dapat ditindaklanjuti.

---

# Fitur Setelah MVP

* Scan beberapa struk sekaligus.
* Sinkronisasi rekening bank (jika tersedia).
* Widget mobile.
* Export PDF.
* Export Excel.
* Pengingat pembayaran tagihan.
* Pengingat budget.
* Mode gelap.
* Multi-currency.
* AI Chat Financial Assistant.
* Prediksi pengeluaran bulan berikutnya.

---

# Desain UI/UX

Desain harus mengutamakan kesederhanaan.

Prinsip desain:

* Modern
* Clean
* Minimalis
* Banyak whitespace
* Mudah dipahami pengguna baru
* Responsif untuk desktop dan mobile
* Fokus pada visualisasi data

Inspirasi:

* Apple
* Linear
* Notion
* Stripe Dashboard
* Arc Browser

Gunakan komponen yang konsisten, animasi halus, dan dashboard yang informatif tanpa terlihat penuh.

---

# Teknologi yang Direkomendasikan

Frontend:

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query

Backend:

* Next.js API Route atau Hono

Database:

* PostgreSQL

ORM:

* Drizzle ORM

Authentication:

* Better Auth

Storage:

* Supabase Storage atau Cloudflare R2

AI:

* OpenAI atau Google Gemini

OCR:

* Google Vision API atau Mistral OCR

Charts:

* Recharts

Deployment:

* Vercel
* Neon PostgreSQL
* Cloudflare

---

# Model Monetisasi

## Free

* Maksimal 30 struk per bulan.
* Budget dasar.
* Dashboard sederhana.

## Pro (Rp29.000–49.000/bulan)

* Scan struk tanpa batas.
* AI Insight lengkap.
* Export PDF & Excel.
* Target tabungan tanpa batas.
* Statistik lanjutan.
* Backup cloud.

---

# Tujuan Jangka Panjang

Receiption diharapkan menjadi aplikasi pengelolaan keuangan pribadi yang membantu mahasiswa dan pengguna muda membangun kebiasaan finansial sejak dini melalui pengalaman yang sederhana, otomatis, dan menyenangkan. Fokus utama bukan hanya mencatat transaksi, tetapi memberikan pemahaman yang lebih baik terhadap pola pengeluaran serta membantu pengguna mencapai tujuan keuangan mereka.
