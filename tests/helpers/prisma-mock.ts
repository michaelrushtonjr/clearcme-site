import { vi } from "vitest";

const prismaMock = vi.hoisted(() => {
  const model = () => Object.fromEntries(
    ["findUnique", "findFirst", "findMany", "create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany", "count"].map((key) => [key, vi.fn()])
  );
  const db = {
    emailLog: model(), extractionReservation: model(), federalTrainingRecord: model(),
    user: model(), account: model(), session: model(), verificationToken: model(), mobileEmailCode: model(),
    physicianLicense: model(), certificate: model(), complianceRule: model(),
    mandatoryRequirement: model(), userRequirementCompletion: model(),
    subscription: model(), stripePriceMap: model(), stripeEvent: model(), billingAnomaly: model(), complianceStatus: model(), emailPreference: model(),
    $transaction: vi.fn(), $queryRaw: vi.fn(),
  };
  db.$transaction.mockImplementation(async (callback) => callback(db));
  return db;
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
export { prismaMock };
