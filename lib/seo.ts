import type { Metadata } from "next";

export const SITE_URL = "https://clearcme.ai";
export const AUTHOR_PATH = "/about/michael-rushton";
export const PUBLISHED = "2026-09-18";

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title, description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: { title, description, url: `${SITE_URL}${path}`, type: "website", siteName: "ClearCME" },
    twitter: { card: "summary", title, description },
  };
}

export const author = { "@type": "Person", name: "Michael Rushton, DO", url: `${SITE_URL}${AUTHOR_PATH}` };
export const organization = {
  "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE_URL}/#organization`,
  name: "ClearCME", url: SITE_URL, logo: `${SITE_URL}/icon.png`, founder: author,
};

export function articleSchema(headline: string, path: string, modified = PUBLISHED, published = PUBLISHED) {
  return {
    "@context": "https://schema.org", "@type": "Article", headline,
    mainEntityOfPage: `${SITE_URL}${path}`, author,
    publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "ClearCME", url: SITE_URL },
    datePublished: `${published}T00:00:00-07:00`, dateModified: `${modified}T00:00:00-07:00`,
  };
}

export function breadcrumbSchema(items: { label: string; href: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({
    "@type": "ListItem", position: index + 1, name: item.label, item: `${SITE_URL}${item.href}`,
  })) };
}
