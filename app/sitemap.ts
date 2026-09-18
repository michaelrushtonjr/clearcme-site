import type { MetadataRoute } from "next";
import { COURSE_CATALOG, keyToSlug } from "@/lib/courses";
import { publishedStateGuides } from "@/lib/state-guides";
import { nationalGuides } from "@/lib/national-guides";
import { AUTHOR_PATH, PUBLISHED, SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    ...["/pricing", "/methodology", "/cme-requirements", "/physician-cme-tracker", AUTHOR_PATH].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${SITE_URL}/mate-act`, lastModified: PUBLISHED, changeFrequency: "monthly", priority: 0.8 },
    ...publishedStateGuides.map((guide) => ({ url: `${SITE_URL}/cme-requirements/${guide.slug}`, lastModified: guide.modified, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...Object.entries(COURSE_CATALOG).filter(([, catalog]) => catalog.courses.length > 0).map(([key]) => ({ url: `${SITE_URL}/courses/${keyToSlug(key)}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...nationalGuides.map((guide) => ({ url: `${SITE_URL}/guides/${guide.slug}`, lastModified: PUBLISHED, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...["/terms", "/privacy"].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
