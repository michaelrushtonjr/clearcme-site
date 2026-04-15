import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-playfair-display",
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
    <html lang="en">
      <body className={`${inter.variable} ${playfairDisplay.variable} ${inter.className}`}>{children}</body>
    </html>
  );
}
