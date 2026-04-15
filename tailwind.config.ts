import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      colors: {
        brand: {
          teal: "#0F766E",
          tealLight: "#0D9488",
          navy: "#1E293B",
          parchment: "#FAFAF7",
        },
      },
    },
  },
} satisfies Config;
