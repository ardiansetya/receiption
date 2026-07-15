import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Free } from "@/components/landing/free";
import { Footer } from "@/components/landing/footer";
import { FAQS } from "@/lib/faq";

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
  offers: {
    "@type": "Offer",
    name: "Gratis",
    price: "0",
    priceCurrency: "IDR",
    description:
      "Semua fitur gratis: 30 scan struk AI per bulan, pencatatan manual, budget, statistik, target tabungan, dan insight AI.",
  },
  featureList:
    "Scan struk dengan AI, kategorisasi otomatis, budget bulanan, statistik pengeluaran, target tabungan, insight AI",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Home() {
  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Free />
      <Footer />
    </main>
  );
}
