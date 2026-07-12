import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://receiption-nu.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default:
      "Receiption - Aplikasi Pencatat Keuangan Otomatis dari Foto Struk",
    template: "%s | Receiption",
  },
  description:
    "Foto struk belanja, transaksi tercatat otomatis. Aplikasi pencatat keuangan pribadi dengan AI OCR untuk mahasiswa dan anak muda: budget bulanan, statistik pengeluaran, target tabungan, dan insight AI. Gratis.",
  keywords: [
    "aplikasi pencatat keuangan",
    "catat pengeluaran otomatis",
    "scan struk belanja",
    "OCR struk",
    "aplikasi keuangan mahasiswa",
    "budget bulanan",
    "atur uang saku",
    "expense tracker Indonesia",
    "target tabungan",
    "AI keuangan pribadi",
  ],
  applicationName: "Receiption",
  category: "finance",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: APP_URL,
    siteName: "Receiption",
    title: "Receiption - Foto Struk, Keuangan Tercatat Otomatis",
    description:
      "AI membaca struk belanjamu, mencatat transaksi, dan mengategorikan otomatis. Budget, statistik, target tabungan, dan insight AI dalam satu dashboard. Gratis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Receiption - Foto Struk, Keuangan Tercatat Otomatis",
    description:
      "AI membaca struk belanjamu, mencatat transaksi, dan mengategorikan otomatis. Gratis untuk mahasiswa dan anak muda.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
