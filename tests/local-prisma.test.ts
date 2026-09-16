import { describe, expect, test } from "vitest";
import { localDatabaseUrl, redact, validateArguments, runPrisma } from "../scripts/local-prisma";

describe("local migration boundary", () => {
  test.each(["localhost", "127.0.0.1", "[::1]"])("accepts local PostgreSQL at %s", (host) => {
    expect(localDatabaseUrl(`postgresql://${host}:51214/template1?schema=public`)).toContain(host);
  });
  test.each([
    "postgresql://remote.example/database",
    "postgresql://localhost.attacker.example/database",
    "prisma+postgres://localhost/database",
    "postgresql://localhost/database?host=remote.example",
    "postgresql://localhost/database?options=-hremote.example",
    "invalid",
  ])("rejects remote or redirecting configuration %s", (url) => {
    expect(() => localDatabaseUrl(url)).toThrow();
  });
  test.each([
    ["migrate", "deploy"],
    ["migrate", "reset"],
    ["db", "push"],
    ["migrate", "dev", "--url=postgresql://remote.example/db"],
    ["migrate", "dev", "--config", "other.config.ts"],
  ])("rejects unsafe command %j", (...args) => {
    expect(() => validateArguments(args)).toThrow();
  });
  test("permits ordinary local development migration options", () => {
    expect(() => validateArguments(["migrate", "dev", "--name", "example", "--create-only"])).not.toThrow();
  });
  test("rejects one PGlite endpoint posing as two databases before connecting", async () => {
    await expect(runPrisma(["migrate", "dev"], "postgres://localhost:51214/template1?schema=public", "postgres://127.0.0.1:51214/shadow?schema=another")).rejects.toThrow("separate local port");
  });
  test("redacts connection credentials from CLI output", () => {
    expect(redact("Failed postgres://user:local@localhost:51214/template1 then prisma+postgres://localhost/?api_key=example")).toBe("Failed [database URL redacted] then [database URL redacted]");
  });
});
