import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>{children}</body>
    </html>
  );
}
