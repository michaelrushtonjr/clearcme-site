import { createHash } from "node:crypto";
import { z } from "zod";

export const earnedHoursSchema = z.number().finite().positive().max(100).multipleOf(0.25);
const text = z.string().trim().min(1).max(2000);
const dateSchema = z.union([z.string().min(1), z.date()]).transform((v) => new Date(v)).refine((v) => Number.isFinite(v.getTime()) && v <= new Date(), "Completion date must be valid and not in the future");
export const certificateFieldsSchema = z.object({
  title: text.nullable(), provider: text, activityDate: dateSchema, hoursEarned: earnedHoursSchema,
});

// Validate each value as well as the whole record: useful fields survive a bad
// model field, but malformed JSON can never be treated as full confidence.
export function validateCertificateFields(input: { title?: unknown; provider?: unknown; activityDate?: unknown; hoursEarned?: unknown; activityMaxHours?: unknown }) {
  const title = text.safeParse(input.title);
  const provider = text.safeParse(input.provider);
  const date = dateSchema.safeParse(input.activityDate);
  const hours = earnedHoursSchema.safeParse(input.hoursEarned);
  const maximum = earnedHoursSchema.safeParse(input.activityMaxHours);
  const data = {
    title: title.success ? title.data : null,
    provider: provider.success ? provider.data : null,
    activityDate: date.success ? date.data : null,
    hoursEarned: hours.success ? hours.data : null,
    activityMaxHours: maximum.success ? maximum.data : null,
  };
  return { ...data, creditHours: data.hoursEarned, valid: certificateFieldsSchema.safeParse(data).success && (input.activityMaxHours == null || maximum.success) };
}

export const extractionSchema = z.object({
  title: z.string().nullable(), provider: z.string().nullable(), date: z.string().nullable(),
  hoursEarned: z.number().nullable(), activityMaxHours: z.number().nullable(),
  creditType: z.string().nullable(), accreditation: z.string().nullable(),
  topics: z.array(z.string()), specialTopics: z.array(z.string()).optional(),
});
export type ExtractedCredit = z.infer<typeof extractionSchema>;

export function parseExtraction(value: unknown): { data: ExtractedCredit; valid: boolean } {
  const parsed = extractionSchema.safeParse(value);
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const fields = validateCertificateFields({ ...raw, activityDate: raw.date });
  const strings = (v: unknown) => z.array(z.string()).safeParse(v).data ?? [];
  return {
    valid: parsed.success && fields.valid,
    data: {
      title: fields.title, provider: fields.provider, date: fields.activityDate?.toISOString() ?? null,
      hoursEarned: fields.hoursEarned, activityMaxHours: fields.activityMaxHours,
      creditType: z.string().safeParse(raw.creditType).data ?? null,
      accreditation: z.string().safeParse(raw.accreditation).data ?? null,
      topics: strings(raw.topics), specialTopics: strings(raw.specialTopics),
    },
  };
}

export function activityFingerprint(fields: { title: string | null; provider: string | null; activityDate: Date | null; hoursEarned: number | null }): string | null {
  if (!fields.title || !fields.provider || !fields.activityDate || !fields.hoursEarned) return null;
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(JSON.stringify([normalize(fields.title), normalize(fields.provider), fields.activityDate.toISOString().slice(0, 10), fields.hoursEarned])).digest("hex");
}
