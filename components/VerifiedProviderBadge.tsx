import { matchProvider } from "@/lib/verified-providers";

interface VerifiedProviderBadgeProps {
  providerName: string | null | undefined;
}

export default function VerifiedProviderBadge({
  providerName,
}: VerifiedProviderBadgeProps) {
  const isVerified = providerName ? matchProvider(providerName) : false;

  // Positive-only signal: an unmatched provider renders nothing. Flagging a
  // legitimate provider "unverified" because our registry hasn't caught up
  // (EM:RAP, ASAM, …) reads as an accusation against the physician's CME —
  // absence of a badge carries the same information without the insult.
  if (!isVerified) return null;

  const tooltip = "Matched to a known ACCME-accredited CME provider.";
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className="product-pill product-pill-met"
    >
      Verified Provider
    </span>
  );
}
