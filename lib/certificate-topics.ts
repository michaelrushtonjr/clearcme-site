import { SpecialTopic } from "@prisma/client";
export interface TopicEvidence { title?: string | null; topics?: string[]; }

export function inferSpecialTopics(extracted: TopicEvidence): SpecialTopic[] {
  const text = [
    extracted.title,
    ...(extracted.topics ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const topics = new Set<SpecialTopic>();

  if (/\bopioids?\b|controlled[- ]substances?/.test(text)) topics.add("OPIOID_PRESCRIBING");
  if (/pain management|pain assessment/.test(text)) topics.add("PAIN_MANAGEMENT");
  if (/substance use|sud\b|oud\b|buprenorphine|addiction|mate act|dea requirement/.test(text)) topics.add("SUBSTANCE_USE");
  if (/implicit bias|unconscious bias|health equity/.test(text)) topics.add("IMPLICIT_BIAS");
  if (/end[- ]of[- ]life|palliative care|hospice/.test(text)) topics.add("END_OF_LIFE_CARE");
  if (/domestic violence|intimate partner violence/.test(text)) topics.add("DOMESTIC_VIOLENCE");
  if (/child abuse|child maltreatment|mandated reporting/.test(text)) topics.add("CHILD_ABUSE");
  if (/elder abuse|older adult abuse/.test(text)) topics.add("ELDER_ABUSE");
  if (/human trafficking|trafficking victim/.test(text)) topics.add("HUMAN_TRAFFICKING");
  if (/infection control|infectious disease prevention|bloodborne pathogen/.test(text)) topics.add("INFECTION_CONTROL");
  if (/patient safety|medical error|risk management|root cause analysis/.test(text)) topics.add("PATIENT_SAFETY");
  if (/ethics|professional responsibility|jurisprudence/.test(text)) topics.add("ETHICS");
  if (/cultural competency|cultural competence|cultural humility/.test(text)) topics.add("CULTURAL_COMPETENCY");
  if (/suicide prevention|suicide assessment|suicide treatment/.test(text)) topics.add("SUICIDE_PREVENTION");

  return Array.from(topics);
}

export function extractedTopicFlags(value: unknown, evidence: TopicEvidence): SpecialTopic[] {
  if (!Array.isArray(value)) return [];
  const suggested = inferSpecialTopics(evidence);
  return [...new Set(value.filter((topic): topic is SpecialTopic => typeof topic === "string" && Object.values(SpecialTopic).includes(topic as SpecialTopic) && suggested.includes(topic as SpecialTopic)))];
}

export function validateTopicAllocations(value: unknown, hours: number): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Enter the hours assigned to each confirmed topic.");
  const entries = Object.entries(value);
  if (entries.some(([topic, amount]) => !Object.values(SpecialTopic).includes(topic as SpecialTopic) || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)) throw new Error("Topic hours must be positive and topics must be recognized.");
  if (!Number.isFinite(hours) || entries.reduce((sum, [, amount]) => sum + amount, 0) > hours) throw new Error("Topic hours cannot exceed the certificate's earned hours.");
  return Object.fromEntries(entries);
}
