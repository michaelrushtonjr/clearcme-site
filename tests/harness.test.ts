import { expect, test } from "vitest";
import { prismaMock } from "./helpers/prisma-mock";
import { prisma } from "@/lib/prisma";
import duplicate from "./fixtures/certs/four-hour-duplicate.json";

test("alias resolves to the offline Prisma mock and fixtures retain duplicate evidence", () => {
  expect(prisma).toBe(prismaMock);
  expect(duplicate).toHaveLength(2);
  expect(duplicate[0]).toEqual(duplicate[1]);
});

test("unmocked network access fails", () => {
  expect(() => fetch("https://example.invalid")).toThrow("mock the network boundary");
});
