import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearCME — Know Exactly What You Need",
  description: "AI-powered CME compliance tracking for physicians. Know exactly what credits you need, track your progress, and never miss a renewal deadline.",
  openGraph: {
    title: "ClearCME — Know Exactly What You Need",
    description: "AI-powered CME compliance tracking for physicians.",
    type: "website",
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
