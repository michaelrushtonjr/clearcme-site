import { prismaMock as db } from "../../../helpers/prisma-mock";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Certificate } from "@prisma/client";
import { NextRequest } from "next/server";
import JSZip from "jszip";
import { licenseInput, requirement } from "../../../helpers/compliance-fixtures";
const ai = vi.hoisted(() => ({ create: vi.fn() }));
const blobs = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn(), get: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = ai; } }));
vi.mock("@vercel/blob", () => blobs);
vi.mock("@/lib/upload-rate-limit", () => ({ limitCertificateUpload: () => null }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user", name: "Test Physician" } })) }));
vi.mock("@/lib/mobile-auth", () => ({ getMobileUserId: vi.fn(async () => null) }));
vi.mock("@/lib/entitlements", () => ({ getEntitlements: vi.fn(async () => ({ ungated: true })), finishExtractionAttempt: vi.fn(), reserveExtractionAttempt: vi.fn(async () => ({ id: "reservation" })), upgradeRequiredResponse: vi.fn() }));
import { finishExtractionAttempt, reserveExtractionAttempt } from "@/lib/entitlements";
import { getMobileUserId } from "@/lib/mobile-auth";
import { POST as upload } from "@/app/api/certificates/route";
import { PATCH, DELETE } from "@/app/api/certificates/[id]/route";
import { POST as reattach } from "@/app/api/certificates/[id]/reattach/route";
import { GET as brokerExport } from "@/app/api/certificates/cebroker-export/route";
import { GET as pdfExport } from "@/app/api/certificates/export/route";
import { GET as audit } from "@/app/api/audit-export/route";
import { activityFingerprint } from "@/lib/certificate-validation";
import { evaluateLicense } from "@/lib/compliance-engine";

let rows: Map<string, Certificate>;
let sequence: number;
const fixture = readFileSync("tests/fixtures/certs/one-hour-max-twenty.txt", "utf8");
const duplicateFixture = JSON.parse(readFileSync("tests/fixtures/certs/four-hour-duplicate.json", "utf8"));
const valid = { title: "Clinical Update", provider: "Test Medical Education", date: "2026-01-15", hoursEarned: 1, activityMaxHours: 20, creditType: "AMA_PRA_1", topics: [], specialTopics: [], accreditation: null };
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function fileRequest(file = new File([fixture], "certificate.pdf", { type: "application/pdf" })) {
  const form = new FormData(); form.set("file", file);
  return new NextRequest("http://localhost/api/certificates", { method: "POST", body: form });
}
function patchRequest(body: object) { return new NextRequest("http://localhost/api/certificates/cert", { method: "PATCH", body: JSON.stringify(body) }); }
function respond(value: unknown) { ai.create.mockResolvedValue({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }] }); }
async function imageUpload(value: unknown, bytes = "different-image") {
  respond(value);
  return upload(fileRequest(new File([bytes], "certificate.png", { type: "image/png" })));
}
function addRow(overrides: Partial<Certificate> = {}) {
  const row = { id: "cert", userId: "user", title: "Clinical Update", provider: "Test Medical Education", activityDate: new Date("2026-01-15"), creditHours: 1, hoursEarned: 1, activityMaxHours: null, activityFingerprint: null, possibleDuplicateOfId: null, fileName: "cert.pdf", fileUrl: null, fileHash: null, storageStatus: "STORE_FAILED", creditType: "AMA_PRA_1", extractionStatus: "COMPLETED", topics: [], specialTopics: [], suggestedSpecialTopics: [], extractedSpecialTopics: [], topicHourAllocations: {}, manuallyVerified: false, createdAt: new Date(), ...overrides } as Certificate;
  rows.set(row.id, row); return row;
}
beforeEach(() => {
  rows = new Map(); sequence = 0;
  db.federalTrainingRecord.findUnique.mockResolvedValue({ kind: "MATE_ACT" });
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "mock-token"); vi.stubEnv("ANTHROPIC_API_KEY", "mock-key");
  vi.mocked(getMobileUserId).mockResolvedValue(null);
  blobs.put.mockResolvedValue({ url: "https://blob.example.invalid/original" }); blobs.del.mockResolvedValue(undefined); blobs.get.mockResolvedValue(null);
  db.certificate.findUnique.mockImplementation(async ({ where }) => rows.get(where.id) ?? null);
  db.certificate.findMany.mockImplementation(async ({ where } = {}) => [...rows.values()].filter((r) =>
    (!where?.userId || r.userId === where.userId) && (!where?.id?.not || r.id !== where.id.not)
    && (where?.activityFingerprint !== null || r.activityFingerprint === null)
    && (where?.possibleDuplicateOfId !== null || r.possibleDuplicateOfId === null)
    && (where?.creditHours === undefined || r.creditHours === where.creditHours)
    && (!where?.activityDate?.gte || (r.activityDate && r.activityDate >= where.activityDate.gte && (!where.activityDate.lt || r.activityDate < where.activityDate.lt) && (!where.activityDate.lte || r.activityDate <= where.activityDate.lte)))
  ));
  db.certificate.findFirst.mockImplementation(async ({ where }) => [...rows.values()].find((r) => r.userId === where.userId && (!where.id?.not || r.id !== where.id.not) && (where.fileHash === undefined || r.fileHash === where.fileHash) && (where.activityFingerprint === undefined || r.activityFingerprint === where.activityFingerprint)) ?? null);
  db.certificate.create.mockImplementation(async ({ data }) => {
    if ([...rows.values()].some((r) => data.fileHash && r.fileHash === data.fileHash && r.userId === data.userId)) throw { code: "P2002" };
    return addRow({ id: `cert-${++sequence}`, creditHours: null, hoursEarned: null, ...data });
  });
  db.certificate.update.mockImplementation(async ({ where, data }) => {
    const row = rows.get(where.id); if (!row) throw new Error("Not found");
    const updated = { ...row, ...data }; rows.set(where.id, updated); return updated;
  });
  db.certificate.updateMany.mockImplementation(async ({ where, data }) => {
    const row = rows.get(where.id); if (row?.fileUrl === where.fileUrl) rows.set(where.id, { ...row, ...data });
    return { count: 1 };
  });
  db.certificate.delete.mockImplementation(async ({ where }) => { const row = rows.get(where.id); rows.delete(where.id); return row; });
  db.$transaction.mockImplementation(async (callback) => {
    const before = new Map(rows); try { return await callback(db); } catch (e) { rows = before; throw e; }
  });
  db.user.findUnique.mockResolvedValue({ id: "user" });
  db.physicianLicense.findMany.mockResolvedValue([licenseInput().license]);
  db.userRequirementCompletion.findMany.mockResolvedValue([]);
  db.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, mandatoryRequirements: [] });
});
afterEach(() => vi.unstubAllEnvs());

test("A1 one-hour/max-twenty fixture earns 1.0, preserves maximum 20, and counts only 1", async () => {
  const response = await upload(fileRequest());
  expect(response.status).toBe(201);
  const { certificate } = await response.json();
  expect(certificate).toMatchObject({ hoursEarned: 1, creditHours: 1, activityMaxHours: 20, extractionStatus: "COMPLETED", storageStatus: "STORED", provider: "Test Medical Education" });
  expect(evaluateLicense(licenseInput({ certificates: [...rows.values()] })).generalHours.counted).toBe(1);
  expect(ai.create).not.toHaveBeenCalled();
});
test("maximum alone is never counted and asks for review", async () => {
  const onlyMax = fixture.replace("This participant earned 1.0 hour of AMA PRA Category 1 Credit.\n", "");
  const response = await upload(fileRequest(new File([onlyMax], "max.pdf", { type: "application/pdf" })));
  expect((await response.json()).certificate).toMatchObject({ hoursEarned: null, creditHours: null, activityMaxHours: 20, extractionStatus: "NEEDS_REVIEW" });
  expect(finishExtractionAttempt).not.toHaveBeenCalledWith("user", "reservation", true);
});
test.each([0, -1, 100.25, 1.1, "4"])("invalid model hours %s require review and never populate compatibility hours", async (hoursEarned) => {
  const response = await imageUpload({ ...valid, hoursEarned });
  expect((await response.json()).certificate).toMatchObject({ creditHours: null, hoursEarned: null, extractionStatus: "NEEDS_REVIEW" });
  expect(finishExtractionAttempt).not.toHaveBeenCalledWith("user", "reservation", true);
});
test.each([{ date: "2999-01-01" }, { date: "not a date" }, { provider: " " }, { date: null }, { topics: "wrong JSON type" }])("incomplete or malformed model JSON cannot be full confidence: %j", async (overrides) => {
  const response = await imageUpload({ ...valid, ...overrides });
  expect((await response.json()).certificate.extractionStatus).toBe("NEEDS_REVIEW");
  expect(finishExtractionAttempt).not.toHaveBeenCalledWith("user", "reservation", true);
});
test("regex recovery reads earned and maximum separately and ignores obsolete creditHours", async () => {
  const response = await imageUpload('{"title":"Clinical Update","provider":"Test Medical Education","date":"2026-01-15","hoursEarned":1,"activityMaxHours":20,"creditHours":20,');
  expect((await response.json()).certificate).toMatchObject({ creditHours: 1, activityMaxHours: 20, extractionStatus: "NEEDS_REVIEW" });
});
test("unknown model shape is reviewable, not silently COMPLETED", async () => {
  const response = await imageUpload([20]);
  expect((await response.json()).certificate.extractionStatus).toBe("NEEDS_REVIEW");
});
test("A1 four-hour duplicate fixture counts 4 and leaves 4 uncertain, including mandatory-topic evidence", async () => {
  for (const [index, data] of duplicateFixture.entries()) await imageUpload({ ...valid, ...data, hoursEarned: data.creditHours, date: data.activityDate, title: "Ethics", topics: ["ethics"], specialTopics: ["ETHICS"] }, `scan-${index}`);
  const values = [...rows.values()];
  expect(values[1].possibleDuplicateOfId).toBe(values[0].id);
  const evaluation = evaluateLicense(licenseInput({ certificates: values, requirements: [requirement({ hoursRequired: 8 })] }));
  expect(evaluation.generalHours).toMatchObject({ counted: 4, uncertain: 4 });
  expect(evaluation.requirements[0].earned).toBe(4);
  await PATCH(patchRequest({ topicHourAllocations: { ETHICS: 4 } }), context(values[1].id));
  expect(evaluateLicense(licenseInput({ certificates: [...rows.values()] })).generalHours.counted).toBe(4);
});
test("normalization matches title/provider casing and whitespace", () => {
  const a = { title: " Clinical Update ", provider: "Test  Medical Education", activityDate: new Date("2026-01-15"), hoursEarned: 4 };
  expect(activityFingerprint(a)).toBe(activityFingerprint({ ...a, title: "clinical update", provider: "test medical education" }));
});
test("same bytes return 409 with ID before another blob or extraction attempt", async () => {
  await upload(fileRequest());
  const response = await upload(fileRequest());
  expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ certificateId: "cert-1", code: "duplicate_file" });
  expect(blobs.put).toHaveBeenCalledTimes(1); expect(reserveExtractionAttempt).toHaveBeenCalledTimes(1);
});
test("concurrent unique-hash conflict also returns 409 without storing a blob", async () => {
  addRow({ fileHash: createHash("sha256").update(fixture).digest("hex") });
  db.certificate.findFirst.mockResolvedValueOnce(null);
  const response = await upload(fileRequest());
  expect(response.status).toBe(409); expect((await response.json()).certificateId).toBe("cert"); expect(blobs.put).not.toHaveBeenCalled();
});
test("same bytes belonging to another user do not reveal or block that certificate", async () => {
  addRow({ userId: "other-user", fileHash: createHash("sha256").update(fixture).digest("hex") });
  expect((await upload(fileRequest())).status).toBe(201);
});
test("PATCH re-suggests topics after title edit and clears unconfirmed flags", async () => {
  addRow({ title: "Opioid prescribing", specialTopics: ["OPIOID_PRESCRIBING"], extractedSpecialTopics: ["OPIOID_PRESCRIBING"], suggestedSpecialTopics: ["OPIOID_PRESCRIBING"] });
  const response = await PATCH(patchRequest({ title: "Clinical ethics" }), context("cert"));
  expect((await response.json()).certificate).toMatchObject({ specialTopics: [], extractedSpecialTopics: [], suggestedSpecialTopics: ["ETHICS"] });
});
test("PATCH invalid hours/date remain NEEDS_REVIEW, never manually certify", async () => {
  addRow();
  const response = await PATCH(patchRequest({ creditHours: 1.1, activityDate: "2999-01-01" }), context("cert"));
  expect((await response.json()).certificate).toMatchObject({ creditHours: null, activityDate: null, extractionStatus: "NEEDS_REVIEW" });
});
test("keep both explicitly clears exclusion; merge removes only duplicate and its file", async () => {
  addRow({ id: "first", creditHours: 4, fileUrl: "https://blob.example.invalid/first" });
  addRow({ id: "second", creditHours: 4, possibleDuplicateOfId: "first", fileUrl: "https://blob.example.invalid/second" });
  await PATCH(patchRequest({ duplicateResolution: "keep_both" }), context("second"));
  expect(rows.get("second")?.possibleDuplicateOfId).toBeNull();
  expect(evaluateLicense(licenseInput({ certificates: [...rows.values()] })).generalHours.counted).toBe(8);
  rows.get("second")!.possibleDuplicateOfId = "first";
  expect((await PATCH(patchRequest({ duplicateResolution: "merge" }), context("second"))).status).toBe(200);
  expect(rows.has("first")).toBe(true); expect(rows.has("second")).toBe(false);
  expect(blobs.del).toHaveBeenCalledWith("https://blob.example.invalid/second");
});
test("blob failure retains extraction and a STORE_FAILED row", async () => {
  blobs.put.mockRejectedValueOnce(new Error("mock storage unavailable"));
  const response = await upload(fileRequest());
  expect((await response.json()).certificate).toMatchObject({ storageStatus: "STORE_FAILED", fileUrl: null, creditHours: 1, extractionStatus: "COMPLETED" });
  expect(rows.size).toBe(1);
});
test("reattach validates known hash before storing, supports mobile, and consumes no extraction", async () => {
  addRow({ fileHash: createHash("sha256").update(fixture).digest("hex") });
  vi.mocked(getMobileUserId).mockResolvedValue("user");
  expect((await reattach(fileRequest(new File(["wrong"], "wrong.pdf", { type: "application/pdf" })), context("cert"))).status).toBe(409);
  expect(blobs.put).not.toHaveBeenCalled();
  expect((await reattach(fileRequest(), context("cert"))).status).toBe(200);
  expect(rows.get("cert")).toMatchObject({ storageStatus: "STORED", creditHours: 1 });
  expect(reserveExtractionAttempt).not.toHaveBeenCalled(); expect(ai.create).not.toHaveBeenCalled();
});
test("reattach cleans up newly stored blob if row update fails", async () => {
  addRow(); db.certificate.update.mockRejectedValueOnce(new Error("mock DB failure"));
  expect((await reattach(fileRequest(), context("cert"))).status).toBe(502);
  expect(blobs.del).toHaveBeenCalledWith("https://blob.example.invalid/original");
  expect(rows.get("cert")?.fileUrl).toBeNull();
});
test("DELETE calls del with the stored URL before deleting the row", async () => {
  addRow({ fileUrl: "https://blob.example.invalid/to-delete", storageStatus: "STORED" });
  expect((await DELETE(new NextRequest("http://localhost"), context("cert"))).status).toBe(200);
  expect(blobs.del).toHaveBeenCalledWith("https://blob.example.invalid/to-delete");
  expect(blobs.del.mock.invocationCallOrder[0]).toBeLessThan(db.certificate.delete.mock.invocationCallOrder[0]);
});
test("blob delete failure retains row; row delete failure records DELETED", async () => {
  addRow({ fileUrl: "https://blob.example.invalid/to-delete", storageStatus: "STORED" });
  blobs.del.mockRejectedValueOnce(new Error("mock blob failure"));
  expect((await DELETE(new NextRequest("http://localhost"), context("cert"))).status).toBe(500);
  expect(db.certificate.delete).not.toHaveBeenCalled();
  db.certificate.delete.mockRejectedValueOnce(new Error("mock DB failure"));
  expect((await DELETE(new NextRequest("http://localhost"), context("cert"))).status).toBe(500);
  expect(rows.get("cert")).toMatchObject({ storageStatus: "DELETED", fileUrl: null, creditHours: 1 });
});
test("file mutations cannot access another user's row", async () => {
  addRow({ userId: "other" });
  expect((await DELETE(new NextRequest("http://localhost"), context("cert"))).status).toBe(404);
  expect((await reattach(fileRequest(), context("cert"))).status).toBe(404);
  expect((await PATCH(patchRequest({ duplicateResolution: "keep_both" }), context("cert"))).status).toBe(404);
  expect(blobs.del).not.toHaveBeenCalled(); expect(blobs.put).not.toHaveBeenCalled();
});
test("ZIP JSON and manifest report a mocked 404 as missing, and only retrieved originals as stored", async () => {
  addRow({ id: "missing", fileUrl: "https://blob.example.invalid/missing", storageStatus: "STORED" });
  addRow({ id: "stored", fileUrl: "https://blob.example.invalid/stored", storageStatus: "STORED" });
  blobs.get.mockImplementation(async (url) => url.endsWith("missing") ? { statusCode: 404, stream: new Blob(["404"]).stream() } : { statusCode: 200, stream: new Blob(["original"]).stream() });
  const response = await audit(new NextRequest("http://localhost/api/audit-export"));
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const name = (suffix: string) => Object.keys(zip.files).find((n) => n.endsWith(`/${suffix}`))!;
  for (const file of ["compliance.json", "Compliance_Summary.json", "manifest.json"]) {
    const json = JSON.parse(await zip.file(name(file))!.async("string"));
    expect(json.certificates.find((c: { id: string }) => c.id === "missing").fileStored).toBe(false);
    expect(json.certificates.find((c: { id: string }) => c.id === "stored").fileStored).toBe(true);
  }
  expect(await zip.file(name("MISSING-ORIGINALS.txt"))!.async("string")).toContain("missing | Clinical Update");
});

test("new scan detects matching legacy metadata without blob reads or a backfill", async () => {
  addRow({ title: " Clinical Update ", provider: "TEST MEDICAL EDUCATION", activityFingerprint: null });
  const response = await imageUpload(valid);
  expect((await response.json()).certificate.possibleDuplicateOfId).toBe("cert");
  expect(blobs.get).not.toHaveBeenCalled();
  expect(rows.get("cert")?.activityFingerprint).toBeNull();
});
test("keeping a duplicate does not erase its exclusion when the target is deleted", async () => {
  addRow({ id: "original" });
  addRow({ id: "duplicate", possibleDuplicateOfId: "original" });
  await DELETE(new NextRequest("http://localhost"), context("original"));
  expect(evaluateLicense(licenseInput({ certificates: [...rows.values()] })).generalHours).toMatchObject({ counted: 0, uncertain: 1 });
});

test("merge preserves the only stored original by moving it to the surviving certificate", async () => {
  addRow({ id: "original", fileUrl: null, fileHash: "original-missing-hash" });
  addRow({ id: "duplicate", possibleDuplicateOfId: "original", fileUrl: "https://blob.example.invalid/only-original", fileHash: "retained-hash", storageStatus: "STORED" });
  expect((await PATCH(patchRequest({ duplicateResolution: "merge" }), context("duplicate"))).status).toBe(200);
  expect(rows.has("duplicate")).toBe(false);
  expect(rows.get("original")).toMatchObject({ fileUrl: "https://blob.example.invalid/only-original", fileHash: "retained-hash", storageStatus: "STORED", creditHours: 1 });
  expect(blobs.del).not.toHaveBeenCalled();
});
test("merge transfer rolls back if updating the surviving row fails", async () => {
  addRow({ id: "original" });
  addRow({ id: "duplicate", possibleDuplicateOfId: "original", fileUrl: "https://blob.example.invalid/only-original" });
  db.certificate.update.mockRejectedValueOnce(new Error("mock write failure"));
  expect((await PATCH(patchRequest({ duplicateResolution: "merge" }), context("duplicate"))).status).toBe(500);
  expect(rows.has("duplicate")).toBe(true); expect(rows.get("original")?.fileUrl).toBeNull();
  expect(blobs.del).not.toHaveBeenCalled();
});

test("CE Broker self-report omits unresolved duplicates while the inventory PDF labels them", async () => {
  addRow({ id: "original", creditHours: 4 });
  addRow({ id: "duplicate", title: "Pending duplicate", creditHours: 4, possibleDuplicateOfId: "original" });
  db.physicianLicense.findFirst.mockResolvedValue({ ...licenseInput().license, licenseNumber: "TEST" });
  const csv = await brokerExport(new NextRequest("http://localhost/api/certificates/cebroker-export?licenseId=license"));
  expect(csv.status).toBe(200);
  const contents = await csv.text();
  expect(contents).toContain("Clinical Update"); expect(contents).not.toContain("Pending duplicate");
  expect(db.certificate.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ possibleDuplicateOfId: null }) }));
  const pdf = await pdfExport(new NextRequest("http://localhost/api/certificates/export"));
  expect(pdf.status).toBe(200);
  expect(await pdf.text()).toContain("Possible duplicate - excluded from counted hours");
});

test("topic-only PATCH also downgrades an invalid legacy completed record", async () => {
  addRow({ creditHours: 101, hoursEarned: null, extractionStatus: "COMPLETED" });
  const response = await PATCH(patchRequest({ topics: ["ethics"] }), context("cert"));
  expect((await response.json()).certificate.extractionStatus).toBe("NEEDS_REVIEW");
  expect(evaluateLicense(licenseInput({ certificates: [...rows.values()] })).generalHours.counted).toBe(0);
});

test("direct private upload verifies bytes and converges on the same duplicate/extraction path", async () => {
  const pathname = "certificates/user/incoming/12345678-1234-1234-1234-123456789012/test.pdf";
  const blobUrl = `https://test.private.blob.vercel-storage.com/${pathname}`;
  blobs.get.mockImplementation(async () => ({ statusCode: 200, blob: { url: blobUrl, contentType: "application/pdf", size: Buffer.byteLength(fixture) }, stream: new Response(fixture).body }));
  const body = { blobUrl, sha256: createHash("sha256").update(fixture).digest("hex") };
  const request = () => new NextRequest("http://localhost/api/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const response = await upload(request());
  expect(response.status).toBe(201);
  expect((await response.json()).certificate).toMatchObject({ hoursEarned: 1, fileUrl: blobUrl, storageStatus: "STORED" });
  expect(blobs.put).not.toHaveBeenCalled();
  expect(blobs.get).toHaveBeenCalledWith(pathname, { access: "private", useCache: false });
  expect((await upload(request())).status).toBe(409);
  expect(reserveExtractionAttempt).toHaveBeenCalledTimes(1);
});
test("private upload rejects cross-user paths, foreign hosts and mismatched hashes before reservation", async () => {
  const path = "certificates/user/incoming/12345678-1234-1234-1234-123456789012/test.pdf";
  const goodUrl = `https://test.private.blob.vercel-storage.com/${path}`;
  blobs.get.mockImplementation(async () => ({ statusCode: 200, blob: { url: goodUrl, contentType: "application/pdf", size: 7 }, stream: new Response("changed").body }));
  for (const [url, status] of [[goodUrl.replace("/user/", "/someone-else/"), 403], ["https://attacker.invalid/test.pdf", 403], [goodUrl, 400]] as const) {
    const response = await upload(new NextRequest("http://localhost/api/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blobUrl: url, sha256: "0".repeat(64) }) }));
    expect(response.status).toBe(status);
  }
  expect(reserveExtractionAttempt).not.toHaveBeenCalled(); expect(db.certificate.create).not.toHaveBeenCalled();
});
test("multipart fallback enforces 4 MB before storage and quota", async () => {
  const response = await upload(fileRequest(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })));
  expect(response.status).toBe(413); expect(reserveExtractionAttempt).not.toHaveBeenCalled();
});
test("decompression bomb becomes NEEDS_REVIEW without an AI call or clean slot", async () => {
  const { deflateSync } = await import("node:zlib");
  const compressed = deflateSync(Buffer.alloc(26 * 1024 * 1024, 65));
  const pdf = Buffer.concat([Buffer.from("%PDF\n<< /Filter /FlateDecode >>\nstream\n"), compressed, Buffer.from("\nendstream")]);
  const response = await upload(fileRequest(new File([pdf], "bomb.pdf", { type: "application/pdf" })));
  expect((await response.json()).certificate).toMatchObject({ extractionStatus: "NEEDS_REVIEW", extractionError: expect.stringContaining("25 MB") });
  expect(ai.create).not.toHaveBeenCalled(); expect(finishExtractionAttempt).not.toHaveBeenCalledWith("user", "reservation", true);
});
test("large audit exports stream into a private blob and return an expiring authenticated link", async () => {
  addRow({ fileUrl: "https://blob.example.invalid/large", fileSize: 21 * 1024 * 1024 });
  blobs.get.mockImplementation(async () => ({ statusCode: 200, stream: new Response(new Uint8Array(21 * 1024 * 1024)).body }));
  blobs.put.mockImplementation(async (_path, stream, options) => {
    expect(options.access).toBe("private");
    const chunks = []; for await (const chunk of stream) chunks.push(chunk);
    const zip = await JSZip.loadAsync(Buffer.concat(chunks));
    expect(Object.keys(zip.files).some((name) => name.endsWith("manifest.json"))).toBe(true);
    return { url: "https://test.private.blob.vercel-storage.com/export.zip" };
  });
  const response = await audit(new NextRequest("http://localhost/api/audit-export"));
  const json = await response.json();
  expect(json.downloadUrl).toMatch(/^\/api\/audit-export\/download\?token=/);
  expect(new Date(json.expiresAt).getTime()).toBeGreaterThan(Date.now());
  expect(blobs.put).toHaveBeenCalledTimes(1);
});
