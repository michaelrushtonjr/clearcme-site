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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
