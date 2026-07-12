import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Pricing } from "@/components/landing/pricing";
import { Footer } from "@/components/landing/footer";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://receiption-nu.vercel.app";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Receiption",
  url: APP_URL,
  description:
    "Aplikasi pencatat keuangan pribadi dengan AI OCR: foto struk belanja, transaksi tercatat dan terkategori otomatis. Budget bulanan, statistik pengeluaran, target tabungan, dan insight AI.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  inLanguage: "id",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "IDR",
      description: "30 scan struk per bulan, budget dasar, dashboard ringkasan.",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "29000",
      priceCurrency: "IDR",
      description:
        "Scan struk tanpa batas, insight AI lengkap, statistik lanjutan, export PDF dan Excel.",
    },
  ],
  featureList:
    "Scan struk dengan AI, kategorisasi otomatis, budget bulanan, statistik pengeluaran, target tabungan, insight AI",
};

export default function Home() {
  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
