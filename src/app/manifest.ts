import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Receiption - Pencatat Keuangan Otomatis",
    short_name: "Receiption",
    description:
      "Foto struk belanja, transaksi tercatat otomatis dengan AI. Budget, statistik, dan target tabungan untuk mahasiswa dan anak muda.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#047857",
    lang: "id",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
