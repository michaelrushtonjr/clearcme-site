import { prismaMock } from "../../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => authMock);
vi.mock("@vercel/blob", () => ({ del: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
import { DELETE } from "@/app/api/account/route";
import { AccountDeletionError, deleteAccount, type AccountDeletionDeps } from "@/lib/account-deletion";

const account = { id: "user", email: "Doc@Example.invalid", subscription: { stripeSubId: "sub_1" }, accounts: [{ refresh_token: "apple-refresh" }], certificates: [{ fileUrl: "https://store.private.blob.vercel-storage.com/certificates/user/a.pdf" }, { fileUrl: null }] };
const order: string[] = [];
const deps = (): AccountDeletionDeps => ({
  cancelSubscription: vi.fn(async () => { order.push("stripe"); }),
  deleteStoredDocuments: vi.fn(async () => { order.push("blobs"); return 1; }),
  sendConfirmation: vi.fn(async () => { order.push("email"); }),
  revokeAppleAccess: vi.fn(async () => { order.push("apple"); return 1; }),
});
beforeEach(() => {
  vi.clearAllMocks(); order.length = 0;
  prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
  prismaMock.user.findUnique.mockResolvedValue(account);
  prismaMock.user.delete.mockImplementation(async () => { order.push("rows"); return account; });
  prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 }); prismaMock.mobileEmailCode.deleteMany.mockResolvedValue({ count: 0 });
});
const request = (body?: unknown) => new Request("http://localhost/api/account", { method: "DELETE", body: body === undefined ? undefined : JSON.stringify(body) });

test("route: signed-out request is rejected before anything is read", async () => {
  authMock.auth.mockResolvedValue(null);
  expect((await DELETE(request({ confirm: "DELETE" }))).status).toBe(401); expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
});
test("route: deletion requires the literal confirmation", async () => {
  authMock.auth.mockResolvedValue({ user: { id: "user" } });
  for (const body of [undefined, {}, { confirm: "delete" }, { confirm: true }]) expect((await DELETE(request(body))).status).toBe(400);
  expect(prismaMock.user.delete).not.toHaveBeenCalled();
});
test("billing stops first, documents go second, rows last, confirmation after", async () => {
  const d = deps(); await deleteAccount("user", d);
  expect(order).toEqual(["stripe", "blobs", "apple", "rows", "email"]);
  expect(d.revokeAppleAccess).toHaveBeenCalledWith(["apple-refresh"]);
  expect(d.deleteStoredDocuments).toHaveBeenCalledWith("user", [account.certificates[0].fileUrl]);
  expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: { in: ["mobile-session:user", "Doc@Example.invalid"] } } });
  expect(prismaMock.mobileEmailCode.deleteMany).toHaveBeenCalledWith({ where: { email: "doc@example.invalid" } });
});
test("a failed subscription cancel deletes nothing", async () => {
  const d = deps(); d.cancelSubscription = vi.fn(async () => { throw new Error("stripe down"); });
  await expect(deleteAccount("user", d)).rejects.toMatchObject({ status: 502 });
  expect(d.deleteStoredDocuments).not.toHaveBeenCalled(); expect(prismaMock.user.delete).not.toHaveBeenCalled();
});
test("a failed document removal keeps the rows so the user can retry", async () => {
  const d = deps(); d.deleteStoredDocuments = vi.fn(async () => { throw new Error("blob down"); });
  await expect(deleteAccount("user", d)).rejects.toBeInstanceOf(AccountDeletionError);
  expect(prismaMock.user.delete).not.toHaveBeenCalled(); expect(d.sendConfirmation).not.toHaveBeenCalled();
});
test("free accounts skip Stripe; a failed confirmation email does not undo the deletion", async () => {
  prismaMock.user.findUnique.mockResolvedValue({ ...account, subscription: null });
  const d = deps(); d.sendConfirmation = vi.fn(async () => { throw new Error("resend down"); });
  await expect(deleteAccount("user", d)).resolves.toEqual({ documentsRemoved: 1 });
  expect(d.cancelSubscription).not.toHaveBeenCalled(); expect(prismaMock.user.delete).toHaveBeenCalledOnce();
});
test("a failed Apple revocation never blocks the deletion", async () => {
  const d = deps(); d.revokeAppleAccess = vi.fn(async () => { throw new Error("apple down"); });
  await expect(deleteAccount("user", d)).resolves.toEqual({ documentsRemoved: 1 }); expect(prismaMock.user.delete).toHaveBeenCalledOnce();
});
test("unknown account is a 404", async () => {
  prismaMock.user.findUnique.mockResolvedValue(null);
  await expect(deleteAccount("ghost", deps())).rejects.toMatchObject({ status: 404 });
});
