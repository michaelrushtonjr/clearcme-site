import type { Metadata } from "next";
import { consoleFontVars } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearCME — Your CME Compliance, Handled",
  description: "Map state CME requirements, track hours of CME, and see exactly what is missing before renewal. Built by a physician for MD and DO licenses.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "ClearCME — Your CME Compliance, Handled",
    description: "Map state CME requirements, track hours of CME, and see exactly what is missing before renewal.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClearCME — Your CME Compliance, Handled",
    description: "Track hours of CME and close state-license gaps before renewal.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inside the iOS app the web view's user agent carries "ClearCMEApp".
            Tagging <html> before first paint lets plain CSS drop purchase UI
            (App Store 3.1.1) with no flash and no dynamic rendering. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(/ClearCMEApp/.test(navigator.userAgent))document.documentElement.setAttribute('data-app-shell','ios')}catch(e){}",
          }}
        />
      </head>
      <body className={consoleFontVars}>{children}</body>
    </html>
  );
}
