import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/* Ikon home screen iOS: iOS memasang rounded mask sendiri. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #065f46 0%, #047857 55%, #10b981 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 104,
            height: 118,
            background: "#ffffff",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            clipPath:
              "polygon(0 0, 100% 0, 100% 92%, 87.5% 100%, 75% 92%, 62.5% 100%, 50% 92%, 37.5% 100%, 25% 92%, 12.5% 100%, 0 92%)",
          }}
        >
          <div
            style={{
              fontSize: 74,
              fontWeight: 700,
              color: "#047857",
              marginTop: -8,
            }}
          >
            R
          </div>
        </div>
      </div>
    ),
    size
  );
}
