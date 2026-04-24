import type { CreditType, PhysicianLicense } from "@prisma/client";

const CREDIT_TYPE_LABELS: Record<CreditType, string> = {
  AMA_PRA_1: "AMA PRA Category 1",
  AMA_PRA_2: "AMA PRA Category 2",
  AAFP_PRESCRIBED: "AAFP Prescribed",
  AAFP_ELECTIVE: "AAFP Elective",
  AOA_1_A: "AOA Category 1-A",
  AOA_1_B: "AOA Category 1-B",
  AOA_2_A: "AOA Category 2-A",
  AOA_2_B: "AOA Category 2-B",
  OTHER: "Other",
};

export const CE_BROKER_STATES = [
  "FL",
  "GA",
  "AL",
  "SC",
  "DC",
  "LA",
  "MS",
  "AR",
  "WV",
  "KY",
  "NV",
  "MI",
  "TN",
  "DE",
] as const;

export type CEBrokerState = (typeof CE_BROKER_STATES)[number];

export function isCEBrokerState(state: string | null | undefined): state is CEBrokerState {
  if (!state) return false;
  return CE_BROKER_STATES.includes(state as CEBrokerState);
}

type ExportCertificate = {
  provider?: string | null;
  title?: string | null;
  activityDate?: Date | null;
  creditHours?: number | null;
  creditType?: CreditType | null;
  accreditation?: string | null;
};

export type CEBrokerExportRow = {
  "Provider Name": string;
  "Course/Activity Title": string;
  "Completion Date": string;
  "Credit Hours": string;
  "Credit Type": string;
  "Accreditation Body": string;
};

export type CEBrokerReport = {
  headers: Array<keyof CEBrokerExportRow>;
  rows: CEBrokerExportRow[];
  csv: string;
  summaryText: string;
};

function formatDateForCsv(date: Date | null | undefined): string {
  if (!date) return "";
  const isoDate = date.toISOString().slice(0, 10);
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year}`;
}

function formatDateForSummary(date: Date | null | undefined): string {
  if (!date) return "Not set";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCreditHours(hours: number | null | undefined): string {
  if (hours == null) return "";
  return Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1);
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function creditTypeLabel(creditType: CreditType | null | undefined): string {
  if (!creditType) return "";
  return CREDIT_TYPE_LABELS[creditType] ?? creditType;
}

export function generateCEBrokerReport(
  certificates: ExportCertificate[],
  license: Pick<PhysicianLicense, "state" | "licenseType" | "licenseNumber" | "renewalDate">
): CEBrokerReport {
  const headers: Array<keyof CEBrokerExportRow> = [
    "Provider Name",
    "Course/Activity Title",
    "Completion Date",
    "Credit Hours",
    "Credit Type",
    "Accreditation Body",
  ];

  const rows: CEBrokerExportRow[] = certificates.map((certificate) => ({
    "Provider Name": certificate.provider?.trim() || "Unknown Provider",
    "Course/Activity Title": certificate.title?.trim() || "Untitled Activity",
    "Completion Date": formatDateForCsv(certificate.activityDate),
    "Credit Hours": formatCreditHours(certificate.creditHours),
    "Credit Type": creditTypeLabel(certificate.creditType),
    "Accreditation Body": certificate.accreditation?.trim() || "",
  }));

  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  const totalHours = certificates.reduce((sum, certificate) => sum + (certificate.creditHours ?? 0), 0);
  const summaryLines = [
    "ClearCME CE Broker Export",
    `License State: ${license.state}`,
    `License Type: ${license.licenseType}`,
    `License Number: ${license.licenseNumber ?? "Not on file"}`,
    `Renewal Date: ${formatDateForSummary(license.renewalDate)}`,
    `Certificates Included: ${certificates.length}`,
    `Total Credit Hours: ${formatCreditHours(totalHours) || "0"}`,
  ];

  return {
    headers,
    rows,
    csv: csvLines.join("\n"),
    summaryText: summaryLines.join("\n"),
  };
}
