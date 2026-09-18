import { describe, expect, it } from "vitest";
import { ACQUISITION_TTL, acquisitionChannel, parseAcquisition, seoCluster } from "@/lib/seo-attribution";
import { publishedStateGuides } from "@/lib/state-guides";
import { nationalGuides } from "@/lib/national-guides";
import { COURSE_CATALOG, keyToSlug } from "@/lib/courses";
import sitemap from "@/app/sitemap";
const now = Date.parse("2026-09-18T12:00:00Z");
const sample = { landing: "/cme-requirements/nevada", cluster: "state_requirements", channel: "organic_search", at: now };
const cookie = (value: unknown) => encodeURIComponent(JSON.stringify(value));
describe("public acquisition boundaries", () => {
  it("allows only actual published routes, never identifiers or URL parameters", () => {
    for (const path of ["/dashboard", "/api/auth/callback/google", "/login?token=secret", "/courses/private", "/cme-requirements/ohio", "/mate-act?email=person@example.com", "/courses/ethics#secret", "/cme-requirements/california/extra"]) expect(seoCluster(path)).toBeNull();
    for (const guide of publishedStateGuides) expect(seoCluster(`/cme-requirements/${guide.slug}`)).toBe("state_requirements");
    for (const guide of nationalGuides) expect(seoCluster(`/guides/${guide.slug}`)).toBe("national_guides");
    for (const [key, catalog] of Object.entries(COURSE_CATALOG)) if (catalog.courses.length) expect(seoCluster(`/courses/${keyToSlug(key)}`)).toBe("course_topics");
  });
  it("rejects malformed, expired, future, private and mismatched attribution", () => {
    expect(parseAcquisition(cookie(sample), now)).toEqual(sample);
    for (const value of [null, {}, { ...sample, landing: "/dashboard" }, { ...sample, cluster: "product_category" }, { ...sample, channel: "email@example.com" }, { ...sample, at: now + 1 }, { ...sample, at: now - ACQUISITION_TTL * 1000 - 1 }]) expect(parseAcquisition(cookie(value), now)).toBeNull();
    expect(parseAcquisition("%malformed", now)).toBeNull();
  });
  it("distinguishes search from campaigns and lookalike domains", () => {
    expect(acquisitionChannel("https://www.google.com/search?q=private", "https://clearcme.ai", false)).toBe("organic_search");
    expect(acquisitionChannel("https://www.google.co.uk/", "https://clearcme.ai", false)).toBe("organic_search");
    expect(acquisitionChannel("https://www.google.com.evil.example/", "https://clearcme.ai", false)).toBe("referral");
    expect(acquisitionChannel("https://google.com/", "https://clearcme.ai", true)).toBe("campaign");
  });
  it("includes only five published states and every nonempty course topic in sitemap", () => {
    const urls = sitemap().map(({ url }) => url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.filter((url) => url.includes("/cme-requirements/"))).toHaveLength(5);
    for (const guide of publishedStateGuides) {
      expect(guide.faqs.length).toBeGreaterThanOrEqual(5);
      expect(guide.faqs.length).toBeLessThanOrEqual(8);
      for (const item of [...guide.topics, ...guide.sections]) for (const id of item.sources) expect(guide.sources.some((source) => source.id === id)).toBe(true);
      for (const topic of guide.topics) if (topic.course) expect(urls).toContain(`https://clearcme.ai/courses/${topic.course}`);
    }
    for (const [key, catalog] of Object.entries(COURSE_CATALOG)) if (catalog.courses.length) expect(urls).toContain(`https://clearcme.ai/courses/${keyToSlug(key)}`);
  });
});
