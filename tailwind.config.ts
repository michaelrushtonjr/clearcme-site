import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      colors: {
        brand: {
          // ─── existing — do not change ───
          teal:         "#0F766E",
          tealLight:    "#0D9488",
          navy:         "#1E293B",
          parchment:    "#FAFAF7",

          // ─── v2 additions ───
          tealDeep:     "#115E59",
          tealTint:     "#E0F2EF",
          tealRule:     "#B5DAD3",
          tealBand:     "#F0FDFA",
          tealBandRule: "#CCFBF1",

          paper:        "#FFFFFF",
          paperSoft:    "#F4F2EA",

          rule:         "#E5E1D2",
          ruleSoft:     "#EFECDD",

          amber:        "#92400E",
          amberMid:     "#B45309",
          amberTint:    "#FBF1DC",
          amberRule:    "#E9D29A",

          crimson:      "#991B1B",
          crimsonTint:  "#FBEAEA",

          emerald:      "#065F46",
          emeraldTint:  "#DDF1E7",
        },
      },
      fontFamily: {
        // deprecation alias — keep for one release cycle
        playfair: ["Newsreader", "Georgia", '"Times New Roman"', "serif"],
        // preferred token going forward
        display:  ["var(--font-display)", "Georgia", '"Times New Roman"', "serif"],
      },
      boxShadow: {
        "card-1": "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
        "card-2": "0 4px 14px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)",
        "card-3": "0 16px 40px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)",
      },
      borderRadius: {
        card:    "16px",
        "card-lg": "20px",
      },
    },
  },
} satisfies Config;
