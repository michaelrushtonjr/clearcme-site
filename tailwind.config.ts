import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      colors: {
        brand: {
          teal:         "#3F5F33",
          tealLight:    "#5A7A4E",
          navy:         "#1E2920",
          parchment:    "#F4EFE3",

          tealDeep:     "#2A4123",
          tealTint:     "#E7ECD9",
          tealRule:     "#BFCBAA",
          tealBand:     "#EEF3E3",
          tealBandRule: "#D8E1C7",

          paper:        "#FFFDF6",
          paperSoft:    "#ECE4CF",

          rule:         "#DDD4BD",
          ruleSoft:     "#ECE3CA",

          amber:        "#A87729",
          amberMid:     "#C9933C",
          amberTint:    "#F4E8CF",
          amberRule:    "#D9BE87",

          crimson:      "#B85631",
          crimsonTint:  "#F4DDD3",

          emerald:      "#6B8E66",
          emeraldTint:  "#E4ECD9",
        },
      },
      fontFamily: {
        // deprecation alias — keep for one release cycle
        playfair: ["Fraunces", "Newsreader", "Georgia", '"Times New Roman"', "serif"],
        // preferred token going forward
        display:  ["var(--font-display)", "Georgia", '"Times New Roman"', "serif"],
      },
      boxShadow: {
        "card-1": "0 1px 2px rgba(30, 41, 32, 0.05), 0 1px 3px rgba(30, 41, 32, 0.06)",
        "card-2": "0 8px 20px -8px rgba(30, 41, 32, 0.18), 0 4px 8px rgba(30, 41, 32, 0.06)",
        "card-3": "0 24px 60px -20px rgba(30, 41, 32, 0.28), 0 8px 18px rgba(30, 41, 32, 0.08)",
      },
      borderRadius: {
        card:    "22px",
        "card-lg": "22px",
      },
    },
  },
} satisfies Config;
