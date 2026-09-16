import { prismaMock as db } from "../helpers/prisma-mock";
import { beforeEach, expect, test } from "vitest";
import { reserveExtractionAttempt, finishExtractionAttempt } from "@/lib/entitlements";
beforeEach(() => {
  db.subscription.findUnique.mockResolvedValue(null);
  db.user.findUnique.mockResolvedValue({ createdAt: new Date("2026-08-01"), extractionsUsed: 0, extractionAttempts: 0 });
  db.$transaction.mockImplementation(async (callback) => callback(db));
  db.$queryRaw.mockResolvedValue([{ id: "user" }]);
  db.extractionReservation.create.mockResolvedValue({});
  db.extractionReservation.findUnique.mockResolvedValue({ id: "lease", userId: "user", expiresAt: new Date(Date.now() + 60000) });
});
test("reservation locks the user before conditional increment and only creates a lease on success", async () => {
  const reservation = await reserveExtractionAttempt("user");
  expect(reservation).toHaveProperty("id");
  expect(db.$queryRaw.mock.calls[0][0].join("")).toContain("FOR UPDATE");
  expect(db.$queryRaw.mock.calls[1][0].join("")).toContain('"extractionsUsed" + (SELECT count(*)');
  expect(db.extractionReservation.create).toHaveBeenCalledOnce();
  expect(db.user.update).not.toHaveBeenCalled();
});
test("denied reservation distinguishes exhausted slots, attempts, and temporary in-flight scans", async () => {
  db.$queryRaw.mockResolvedValue([]);
  for (const [extractionsUsed, extractionAttempts, status, reason] of [[3, 3, 402, "slots"], [0, 10, 402, "attempts"], [0, 2, 429, undefined]] as const) {
    db.user.findUnique.mockResolvedValue({ createdAt: new Date("2026-08-01"), extractionsUsed, extractionAttempts });
    const response = await reserveExtractionAttempt("user") as Response;
    expect(response.status).toBe(status); expect((await response.json()).reason).toBe(reason);
  }
  expect(db.extractionReservation.create).not.toHaveBeenCalled();
});
test("only clean scans consume a lifetime slot, while failed scans release their lease", async () => {
  await finishExtractionAttempt("user", "lease", false);
  expect(db.user.update).not.toHaveBeenCalled(); expect(db.extractionReservation.delete).toHaveBeenCalledWith({ where: { id: "lease" } });
  await finishExtractionAttempt("user", "lease", true);
  expect(db.user.update).toHaveBeenCalledWith({ where: { id: "user" }, data: { extractionsUsed: { increment: 1 } } });
  db.extractionReservation.findUnique.mockResolvedValue(null);
  await finishExtractionAttempt("user", "lease", true);
  expect(db.user.update).toHaveBeenCalledTimes(1);
});
test("expired leases cannot finalize a clean result after another scan reuses the slot", async () => {
  db.extractionReservation.findUnique.mockResolvedValue({ userId: "user", expiresAt: new Date(Date.now() - 1) });
  await expect(finishExtractionAttempt("user", "lease", true)).rejects.toThrow("expired");
  expect(db.user.update).not.toHaveBeenCalled();
});
