import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

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
    <html lang="en" className={newsreader.variable}>
      <body>{children}</body>
    </html>
  );
}
