import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://receiption.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/transactions",
          "/budgets",
          "/stats",
          "/goals",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
