import { matchProvider } from "@/lib/verified-providers";

interface VerifiedProviderBadgeProps {
  providerName: string | null | undefined;
}

export default function VerifiedProviderBadge({
  providerName,
}: VerifiedProviderBadgeProps) {
  const isVerified = providerName ? matchProvider(providerName) : false;
  const label = isVerified ? "✓ Verified Provider" : "⚠ Unverified Provider";
  const classes = isVerified
    ? "product-pill-met"
    : "product-pill-pending";
  const tooltip = isVerified
    ? "Matched to a known ACCME-accredited CME provider."
    : "We could not match this provider to our known ACCME-accredited provider list.";

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={`product-pill ${classes}`}
    >
      {label}
    </span>
  );
}
