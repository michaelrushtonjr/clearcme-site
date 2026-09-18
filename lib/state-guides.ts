import content from "@/content/state-guides.json";
import type { StateCode } from "@/lib/state-requirements";

export type GuideSource = { id: string; label: string; url: string; quote?: string };
export type GuideSection = { title: string; paragraphs: string[]; sources: string[] };
export type StateGuide = {
  slug: string; code: StateCode; name: string; status: "published" | "draft";
  title: string; description: string; summary: string; verified: string; modified: string;
  boards: { label: string; hours: string; cycle: string; credit: string }[];
  topics: { title: string; detail: string; sources: string[]; course?: string }[];
  sections: GuideSection[]; faqs: { question: string; answer: string }[];
  sources: GuideSource[]; related: string[]; productNote: string;
};

const guides = content as StateGuide[];
export const publishedStateGuides = guides.filter((guide) => guide.status === "published");
export function getStateGuide(slug: string) { return publishedStateGuides.find((guide) => guide.slug === slug); }
export function relatedStatesForTopic(topic: string) { return publishedStateGuides.filter((guide) => guide.topics.some((item) => item.course === topic)); }
