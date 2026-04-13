export type Course = {
  name: string;
  provider: string;
  providerUrl: string;
  credits: string;
  creditType: string;
  price: string;
  isFree: boolean;
  isHippo: boolean;
  description: string;
  url: string;
};

export type TopicCatalog = {
  topicLabel: string;
  requirement: string;
  courses: Course[];
};

export const COURSE_CATALOG: Record<string, TopicCatalog> = {
  SUBSTANCE_USE: {
    topicLabel: "DEA MATE Act / SUD Treatment",
    requirement: "8 hours, one-time (DEA-registered physicians)",
    courses: [
      {
        name: "OUD Decoded",
        provider: "Hippo Education",
        providerUrl: "https://home.hippoed.com",
        credits: "12.25 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Included with Hippo subscription",
        isFree: false,
        isHippo: true,
        description:
          "Satisfy the DEA MATE Act 8-hr requirement with this comprehensive audio course on treating patients with opioid use disorder.",
        url: "https://home.hippoed.com/oud-decoded",
      },
    ],
  },
  OPIOID_PRESCRIBING: {
    topicLabel: "Opioid Prescribing",
    requirement: "Varies by state (2-3 hrs, recurring)",
    courses: [
      {
        name: "OUD Decoded",
        provider: "Hippo Education",
        providerUrl: "https://home.hippoed.com",
        credits: "12.25 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Included with Hippo subscription",
        isFree: false,
        isHippo: true,
        description:
          "Covers opioid prescribing best practices, risk management, and SUD treatment — satisfies most state opioid prescribing mandates.",
        url: "https://home.hippoed.com/oud-decoded",
      },
      {
        name: "Safe Opioid Prescribing",
        provider: "CME Outfitters",
        providerUrl: "https://www.cmeoutfitters.com",
        credits: "1-3 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "Free accredited course on safe opioid prescribing practices.",
        url: "https://www.cmeoutfitters.com/opioidquicklinks/",
      },
    ],
  },
  ETHICS: {
    topicLabel: "Medical Ethics",
    requirement: "1-2 hours, recurring",
    courses: [
      {
        name: "Ethics & Resilience in Healthcare",
        provider: "CME Outfitters",
        providerUrl: "https://www.cmeoutfitters.com",
        credits: "1-2 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description:
          "Accredited ethics CME covering professional responsibility, resilience, and ethical decision-making.",
        url: "https://www.cmeoutfitters.com/activity/integrating-resilience-ethics-and-traumatic-stress-relief-to-cultivate-a-culture-of-wellbeing/",
      },
    ],
  },
  IMPLICIT_BIAS: {
    topicLabel: "Implicit Bias / Cultural Competency",
    requirement: "1-2 hours, recurring",
    courses: [
      {
        name: "Addressing Racial Disparities and Bias in Health Care",
        provider: "CME Outfitters",
        providerUrl: "https://www.cmeoutfitters.com",
        credits: "1-2 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description:
          "Free accredited course on implicit bias, health equity, and cultural competency.",
        url: "https://www.cmeoutfitters.com/activity/findings-from-an-educational-initiative-addressing-racial-disparities-and-bias-in-health-care-2/",
      },
    ],
  },
  PATIENT_SAFETY: {
    topicLabel: "Patient Safety / Medical Error Prevention",
    requirement: "2 hours, recurring (FL, MA, CT)",
    courses: [
      {
        name: "Patient Safety CME",
        provider: "ACEP Anytime",
        providerUrl: "https://www.acep.org/acepanytime",
        credits: "2 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "ACEP member pricing",
        isFree: false,
        isHippo: false,
        description:
          "ACEP-accredited patient safety content for emergency medicine physicians.",
        url: "https://www.acep.org/acepanytime/",
      },
    ],
  },
  SUICIDE_PREVENTION: {
    topicLabel: "Suicide Prevention & Awareness",
    requirement: "2 hours (initial, then every 4 years)",
    courses: [
      {
        name: "Suicide Prevention for Healthcare Professionals",
        provider: "Pri-Med",
        providerUrl: "https://bootcamp.pri-med.com",
        credits: "2 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description:
          "Evidence-based suicide prevention training for healthcare professionals.",
        url: "https://bootcamp.pri-med.com/en/mental-health",
      },
    ],
  },
  DOMESTIC_VIOLENCE: {
    topicLabel: "Domestic Violence",
    requirement: "1-2 hours (varies by state)",
    courses: [
      {
        name: "Domestic Violence CME",
        provider: "CME Outfitters",
        providerUrl: "https://www.cmeoutfitters.com",
        credits: "1-2 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description:
          "Accredited CME on identifying and responding to domestic violence in clinical settings.",
        url: "https://www.cmeoutfitters.com",
      },
    ],
  },
  HUMAN_TRAFFICKING: {
    topicLabel: "Human Trafficking",
    requirement: "1 hour (TX, MI, DC)",
    courses: [
      {
        name: "Human Trafficking CME",
        provider: "CME Outfitters",
        providerUrl: "https://www.cmeoutfitters.com",
        credits: "1 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description:
          "Accredited training on recognizing and responding to human trafficking.",
        url: "https://www.cmeoutfitters.com",
      },
    ],
  },
};

/** Convert a URL-slug back to a COURSE_CATALOG key.
 *  e.g. "substance-use" → "SUBSTANCE_USE"
 */
export function slugToKey(slug: string): string {
  return slug.toUpperCase().replace(/-/g, "_");
}

/** Convert a COURSE_CATALOG key to a URL slug.
 *  e.g. "SUBSTANCE_USE" → "substance-use"
 */
export function keyToSlug(key: string): string {
  return key.toLowerCase().replace(/_/g, "-");
}
