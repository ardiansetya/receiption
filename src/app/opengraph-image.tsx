import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Receiption — Foto struk, keuangan tercatat otomatis dengan AI";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #052e22 0%, #064e3b 55%, #047857 100%)",
          padding: 72,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            R
          </div>
          <div style={{ fontSize: 44, fontWeight: 600 }}>Receiption</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            Foto struk. Keuangan tercatat.
          </div>
          <div style={{ fontSize: 34, color: "#a7f3d0", maxWidth: 900 }}>
            AI membaca struk belanjamu, mencatat transaksi, dan mengategorikan
            otomatis. Gratis.
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 26, color: "#d1fae5" }}>
          <span>Scan Struk AI</span>
          <span>·</span>
          <span>Budget Bulanan</span>
          <span>·</span>
          <span>Statistik</span>
          <span>·</span>
          <span>Target Tabungan</span>
        </div>
      </div>
    ),
    size
  );
}
