import type { MetadataRoute } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://receiption-nu.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  /* Hanya landing yang indexable; login/register/dashboard noindex. */
  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
