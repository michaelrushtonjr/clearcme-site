import { JetBrains_Mono, Newsreader, Plus_Jakarta_Sans } from "next/font/google";

// Console-1b type system (design/console-1b/README.md). Exposed as CSS
// variables on <body> so both the login page and the console shell can use
// them without loading fonts twice.
export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jbmono",
  display: "swap",
});

export const consoleFontVars = `${newsreader.variable} ${jakarta.variable} ${jetbrainsMono.variable}`;
