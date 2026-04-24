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
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
  const tooltip = isVerified
    ? "Matched to a known ACCME-accredited CME provider."
    : "We could not match this provider to our known ACCME-accredited provider list.";

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
