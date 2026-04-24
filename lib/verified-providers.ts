const normalizeProviderName = (providerName: string): string =>
  providerName
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const VERIFIED_PROVIDER_SOURCE_NAMES = [
  "AAFP",
  "AMA",
  "ACEP",
  "ACP",
  "Hippo Education",
  "Harvard Medical School",
  "Mayo Clinic",
  "Stanford Medicine",
  "Johns Hopkins",
  "Mount Sinai",
  "Cleveland Clinic",
  "UCSF",
  "UCLA",
  "Rush University",
  "Baylor College of Medicine",
  "Emory University",
  "FreeCME",
  "Relias",
  "NetCE",
  "Pri-Med",
  "CME Outfitters",
  "ScientiaCME",
  "AdventHealth",
  "Advocate Health",
  "ASAM",
  "Baptist Health South Florida",
  "HCA Healthcare",
  "MedStar Health",
  "Memorial Healthcare System",
  "The Doctors Company",
  "RxCE",
  "PCSS",
  "MedBridge",
] as const;

export const VERIFIED_PROVIDERS = new Set(
  VERIFIED_PROVIDER_SOURCE_NAMES.map((providerName) => normalizeProviderName(providerName))
);

export function matchProvider(providerName: string): boolean {
  const normalizedProviderName = normalizeProviderName(providerName);

  if (!normalizedProviderName) {
    return false;
  }

  for (const verifiedProvider of VERIFIED_PROVIDERS) {
    if (
      normalizedProviderName.includes(verifiedProvider) ||
      verifiedProvider.includes(normalizedProviderName)
    ) {
      return true;
    }
  }

  return false;
}
