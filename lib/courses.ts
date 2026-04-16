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
  // Optional Scout-sourced metadata
  accreditation?: string;
  deaMateCompliant?: boolean;
  stateAcceptance?: string;
  verified?: string;
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
    // Auto-synced from Scout catalog — 2026-04-16T14:40:26.454Z
      {
        name: "POWER: Prevention of Opioid Misuse in Women through Education and Resource",
        provider: "FreeCME (by Relias)",
        providerUrl: "https://www.freecme.com",
        credits: "6 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "Relias/FreeCME platform. Search \"POWER\" on freecme.com. 6-hour series focused on opioid misuse prevention in women. Requires free account.",
        url: "https://www.freecme.com/",
        accreditation: "ACCME",
        deaMateCompliant: false,
        stateAcceptance: "All states accepting AMA PRA Category 1",
        verified: "2026-04-16",
      }
    ],
  },
  OPIOID_PRESCRIBING: {
    topicLabel: "Opioid Prescribing",
    requirement: "Varies by state (2-3 hrs, recurring)",
    courses: [
    // Auto-synced from Scout catalog — 2026-04-16T14:40:26.454Z
      {
        name: "Pain Management and Opioids CME",
        provider: "NEJM Knowledge+",
        providerUrl: "https://knowledgeplus.nejm.org",
        credits: "10.25 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "Case-based learning with 60+ clinical scenarios. Excellent for clinically rigorous learning.",
        url: "https://knowledgeplus.nejm.org/cme-mocs/pain-management-and-opioids-cme/",
        accreditation: "ACCME",
        deaMateCompliant: true,
        stateAcceptance: "All states accepting AMA PRA Category 1",
        verified: "2026-04-15",
      },
      {
        name: "Online 8-Hour SUD 101 Training",
        provider: "PCSS-MOUD (funded by SAMHSA)",
        providerUrl: "https://pcssnow.org",
        credits: "8 AMA PRA Category 1 / AAPA Category 1 / ANCC / ACPE / IPCE",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "Comprehensive 8-module bundle covering SUD overview, assessment, and MOUD. Fulfills the full 8-hour federal requirement.",
        url: "https://pcssnow.org/medications-for-opioid-use-disorder/",
        accreditation: "ACCME / AAPA / ANCC / ACPE",
        deaMateCompliant: true,
        stateAcceptance: "All states accepting AMA PRA Category 1",
        verified: "2026-04-15",
      },
      {
        name: "Online 8-Hour Training: Pain, Opioids & Effective Patient Care",
        provider: "PCSS-MOUD",
        providerUrl: "https://pcssnow.org",
        credits: "8 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "Flexible curriculum allowing users to pick 8 modules from 14 options in the Pain Core Curriculum.",
        url: "https://pcssnow.org/medications-for-opioid-use-disorder/",
        accreditation: "ACCME",
        deaMateCompliant: true,
        stateAcceptance: "All states accepting AMA PRA Category 1",
        verified: "2026-04-15",
      },
      {
        name: "Opioid and Substance Use Disorder CME/CE",
        provider: "Pri-Med",
        providerUrl: "https://www.pri-med.com",
        credits: "8 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "Specifically designed for primary care providers to meet the MATE Act requirement.",
        url: "https://www.pri-med.com/online-education/opioid-sud-cme-center",
        accreditation: "ACCME",
        deaMateCompliant: true,
        stateAcceptance: "All states accepting AMA PRA Category 1",
        verified: "2026-04-15",
      }
    ],
  },
  ETHICS: {
    topicLabel: "Medical Ethics",
    requirement: "1-2 hours, recurring",
    courses: [
    // Auto-synced from Scout catalog — 2026-04-16T14:40:26.454Z
      {
        name: "Ethical Dilemmas in Patient Care",
        provider: "Medscape Education",
        providerUrl: "https://www.medscape.org",
        credits: "1 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "Explores common ethical challenges in clinical practice. Requires free Medscape account.",
        url: "https://www.medscape.org/public/ethics",
        accreditation: "ACCME",
        deaMateCompliant: false,
        stateAcceptance: "All states accepting AMA PRA Category 1",
        verified: "2026-04-15",
      },
      {
        name: "Medical Ethics: Patient Autonomy and Confidentiality",
        provider: "Pri-Med",
        providerUrl: "https://www.pri-med.com",
        credits: "1 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "Focuses on foundational principles of medical ethics in a primary care context.",
        url: "https://www.pri-med.com/online-education/ethics-cme",
        accreditation: "ACCME",
        deaMateCompliant: false,
        stateAcceptance: "All states accepting AMA PRA Category 1",
        verified: "2026-04-15",
      },
      {
        name: "Boundaries for Physicians",
        provider: "AMA Ed Hub",
        providerUrl: "https://edhub.ama-assn.org",
        credits: "1 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free for AMA Members (varies for non-members)",
        isFree: true,
        isHippo: false,
        description: "Part of the AMA Code of Medical Ethics collection.",
        url: "https://edhub.ama-assn.org/pages/ethics-collection",
        accreditation: "ACCME",
        deaMateCompliant: false,
        stateAcceptance: "All states accepting AMA PRA Category 1",
        verified: "2026-04-15",
      }
    ],
  },
  IMPLICIT_BIAS: {
    topicLabel: "Implicit Bias / Cultural Competency",
    requirement: "1-2 hours, recurring",
    courses: [
    // Auto-synced from Scout catalog — 2026-04-16T14:40:26.454Z
      {
        name: "Unveiling Unconscious Bias",
        provider: "Stanford Center for CME",
        providerUrl: "https://cme.stanford.edu",
        credits: "1 AMA PRA Category 1",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "High-quality module from Stanford addressing implicit bias in healthcare.",
        url: "https://cme.stanford.edu/",
        accreditation: "ACCME",
        deaMateCompliant: false,
        stateAcceptance: "All states accepting AMA PRA Category 1; specifically meets California and Illinois requirements.",
        verified: "2026-04-15",
      }
    ],
  },
  PATIENT_SAFETY: {
    topicLabel: "Patient Safety / Medical Error Prevention",
    requirement: "2 hours, recurring (FL, MA, CT)",
    courses: [
    // No Scout courses yet for this topic

    ],
  },
  SUICIDE_PREVENTION: {
    topicLabel: "Suicide Prevention & Awareness",
    requirement: "2 hours (initial, then every 4 years)",
    courses: [
    // Auto-synced from Scout catalog — 2026-04-16T14:40:26.454Z
      {
        name: "Project ECHO Addiction/SUD/Behavioral Health Programs (CME Available via iECHO)",
        provider: "Project ECHO (University of New Mexico)",
        providerUrl: "https://iecho.org",
        credits: "1 AMA PRA Category 1 / ANCC",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "ECHO teleECHO sessions offer CME for live attendance. Topics include addiction, SUD, mental health, and suicide prevention. Register at iecho.org to find a program near your specialty. Many sessions are weekly and free to join. CME credit typically requires live attendance.",
        url: "https://iecho.org/welcome (register and search addiction/behavioral health programs)",
        accreditation: "ACCME (varies by hub — check individual program)",
        deaMateCompliant: false,
        stateAcceptance: "All states accepting AMA PRA Category 1",
        verified: "2026-04-16",
      }
    ],
  },
  DOMESTIC_VIOLENCE: {
    topicLabel: "Domestic Violence",
    requirement: "1-2 hours (varies by state)",
    courses: [
    // No Scout courses yet for this topic

    ],
  },
  HUMAN_TRAFFICKING: {
    topicLabel: "Human Trafficking",
    requirement: "1 hour (TX, MI, DC)",
    courses: [
    // Auto-synced from Scout catalog — 2026-04-16T14:40:26.454Z
      {
        name: "Identifying Human Trafficking: What Physicians Need to Know",
        provider: "Texas Medical Association (TMA)",
        providerUrl: "https://www.texmed.org",
        credits: "1 AMA PRA Category 1 / Ethics Credit",
        creditType: "AMA_PRA_1",
        price: "Free",
        isFree: true,
        isHippo: false,
        description: "Fulfills both Ethics and Human Trafficking requirements for many states.",
        url: "https://www.texmed.org/Education/",
        accreditation: "ACCME",
        deaMateCompliant: false,
        stateAcceptance: "All states accepting AMA PRA Category 1. Specifically meets Texas mandatory requirement.",
        verified: "2026-04-15",
      }
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
