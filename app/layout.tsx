import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearCME — CME Compliance, Guaranteed",
  description: "Map state CME requirements, track hours of CME, and see exactly what is missing before renewal. Built by a physician for MD and DO licenses.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ClearCME — CME Compliance, Guaranteed",
    description: "Map state CME requirements, track hours of CME, and see exactly what is missing before renewal.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClearCME — CME Compliance, Guaranteed",
    description: "Track hours of CME and close state-license gaps before renewal.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
