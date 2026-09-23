import { describe, expect, it } from "vitest";
import { maskIdentifiers } from "@/lib/analytics-privacy";

describe("maskIdentifiers", () => {
  it("masks NPI, DEA and license numbers", () => {
    expect(maskIdentifiers("NPI 1234567890")).toBe("NPI **********");
    expect(maskIdentifiers("DEA Number AB1234567")).toBe("DEA Number *********");
    expect(maskIdentifiers("License #G12345")).toBe("License #******");
    expect(maskIdentifiers("License #MD.0012345")).toBe("License #MD.*******");
  });

  it("leaves dates, hours of CME and prices readable", () => {
    const text = "Renews 06/30/2027 · completed 2026-09-18 · 1.5 hours of CME · $1,000 · 40 of 40 hours";
    expect(maskIdentifiers(text)).toBe(text);
  });
});
