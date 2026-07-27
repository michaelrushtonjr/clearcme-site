import Link from "next/link";
import { PublicShell } from "@/components/PublicSiteShell";

export default function NotFound() {
  return (
    <PublicShell>
      <section className="public-hero mx-auto max-w-2xl text-center">
        <div className="public-kicker mb-6">404</div>
        <h1 className="public-heading mb-5 text-4xl sm:text-5xl">
          That page isn&apos;t here.
        </h1>
        <p className="public-subhead mx-auto mb-10 max-w-xl">
          The link may be outdated or mistyped. Your compliance map, pricing, and
          the DEA MATE Act checker are all one click away.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="public-btn-primary">
            Go to ClearCME →
          </Link>
          <Link href="/pricing" className="public-btn-secondary">
            See pricing
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
