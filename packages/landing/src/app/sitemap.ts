import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/content";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing/`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacy/`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
