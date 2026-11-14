import { prismaMock as db } from "../helpers/prisma-mock";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test } from "vitest";
import { freeReads, getFreeReads } from "@/lib/entitlements";
import FreeReadsNote, { freeReadsBlockReason, freeReadsCount } from "@/components/FreeReadsNote";
import UpgradeNotice from "@/components/UpgradeNotice";

beforeEach(() => {
  db.subscription.findUnique.mockResolvedValue(null);
  db.user.findUnique.mockResolvedValue({ createdAt: new Date("2026-08-01"), extractionsUsed: 1, extractionAttempts: 2 });
});

test("a Free account sees its clean reads left out of 3", () => {
  expect(freeReads({ ungated: false, extractionsUsed: 0, extractionAttempts: 0 })).toEqual({ limit: 3, used: 0, left: 3 });
  expect(freeReads({ ungated: false, extractionsUsed: 2, extractionAttempts: 4 })).toEqual({ limit: 3, used: 2, left: 1 });
  expect(freeReads({ ungated: false, extractionsUsed: 3, extractionAttempts: 3 })).toEqual({ limit: 3, used: 3, left: 0 });
  // A counter past the limit never shows a negative number.
  expect(freeReads({ ungated: false, extractionsUsed: 5, extractionAttempts: 5 })?.left).toBe(0);
});

test("the 10-scan backstop caps what is left, so the count never promises a read the server will refuse", () => {
  expect(freeReads({ ungated: false, extractionsUsed: 1, extractionAttempts: 9 })).toEqual({ limit: 3, used: 1, left: 1 });
  expect(freeReads({ ungated: false, extractionsUsed: 1, extractionAttempts: 10 })).toEqual({ limit: 3, used: 1, left: 0 });
});

test("paid and grandfathered accounts have no counter", () => {
  expect(freeReads({ ungated: true, extractionsUsed: 40, extractionAttempts: 40 })).toBeNull();
});

test("getFreeReads reads the account's lifetime counters and never throws", async () => {
  expect(await getFreeReads("user")).toEqual({ limit: 3, used: 1, left: 2 });
  db.user.findUnique.mockResolvedValue({ createdAt: new Date("2026-07-01"), extractionsUsed: 9, extractionAttempts: 9 });
  expect(await getFreeReads("user")).toBeNull(); // created before the fences: grandfathered
  db.user.findUnique.mockRejectedValue(new Error("database unavailable"));
  expect(await getFreeReads("user")).toBeUndefined();
});

test("the note states the count, and renders nothing for unlimited accounts", () => {
  expect(freeReadsCount({ limit: 3, used: 1, left: 2 })).toBe("2 of 3");
  const html = renderToStaticMarkup(createElement(FreeReadsNote, { reads: { limit: 3, used: 1, left: 2 } }));
  expect(html).toContain("2 of 3 free certificate reads left.");
  expect(html).toContain('href="/dashboard/certificates/new"');
  // The wording shown inside the iPhone app names no plan.
  expect(/class="app-only[^"]*"[^>]*>2 of 3 certificate reads left on your current plan\./.test(html)).toBe(true);
  expect(renderToStaticMarkup(createElement(FreeReadsNote, { reads: null }))).toBe("");
  expect(renderToStaticMarkup(createElement(FreeReadsNote, { reads: undefined }))).toBe("");
});

test("with no reads left the uploader knows which limit card to show", () => {
  expect(freeReadsBlockReason({ limit: 3, used: 1, left: 2 })).toBe(false);
  expect(freeReadsBlockReason({ limit: 3, used: 3, left: 0 })).toBe("slots");
  expect(freeReadsBlockReason({ limit: 3, used: 1, left: 0 })).toBe("attempts");
  expect(freeReadsBlockReason(null)).toBe(false);
});

test("the limit card has a real button, and the plan button is hidden in the iPhone app", () => {
  const extraction = renderToStaticMarkup(createElement(UpgradeNotice, { feature: "extraction", reason: "slots" }));
  expect(extraction).toMatch(/<a class="app-hide product-btn product-btn-brand[^"]*" href="\/pricing\?checkout=essential">Upgrade to Essential<\/a>/);
  expect(extraction).toMatch(/<a class="product-btn product-btn-secondary[^"]*" href="\/dashboard\/certificates\/new">Add manually<\/a>/);
  const licenses = renderToStaticMarkup(createElement(UpgradeNotice, { feature: "licenses", limit: 1 }));
  expect(licenses).toMatch(/<a class="app-hide product-btn product-btn-brand[^"]*" href="\/pricing">See plans<\/a>/);
  const pro = renderToStaticMarkup(createElement(UpgradeNotice, { feature: "licenses", limit: 2 }));
  expect(pro).toContain(">Upgrade to Pro</a>");
  // The in-app wording still names no plan or price.
  const appCopy = /<div class="app-only">(.*?)<\/div>/.exec(extraction)?.[1] ?? "";
  expect(appCopy).not.toMatch(/Essential|Pro\b|Free\b|\$/);
});
