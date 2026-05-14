import Link from "next/link";

const defaultLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/mate-act", label: "DEA MATE Act" },
  { href: "/methodology", label: "Methodology" },
];

export function PublicNav({
  links = defaultLinks,
}: {
  links?: { href: string; label: string }[];
}) {
  return (
    <nav className="public-nav" aria-label="Main navigation">
      <div className="public-wrap public-nav-row">
        <Link href="/" className="public-brand" aria-label="ClearCME home">
          <span className="public-brand-mark" aria-hidden="true" />
          ClearCME
        </Link>
        <div className="public-nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="public-nav-link">
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="public-nav-cta">
            Sign in →
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-wrap public-footer-row">
        <Link href="/" className="public-brand public-footer-brand" aria-label="ClearCME home">
          <span className="public-brand-mark" aria-hidden="true" />
          ClearCME
        </Link>
        <div className="public-footer-links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/mate-act">DEA MATE Act</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <p>© {new Date().getFullYear()} ClearCME. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function PublicShell({
  children,
  links,
  className = "",
}: {
  children: React.ReactNode;
  links?: { href: string; label: string }[];
  className?: string;
}) {
  return (
    <main className={`public-site min-h-screen ${className}`.trim()}>
      <PublicNav links={links} />
      {children}
      <PublicFooter />
    </main>
  );
}
