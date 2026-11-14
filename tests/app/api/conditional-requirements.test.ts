import { prismaMock as db } from "../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user" } })) }));
import { POST } from "@/app/api/conditional-requirements/route";
import { deaRegistrationFromSetup } from "@/lib/conditional-requirements";
import { evaluateFederalTraining } from "@/lib/compliance-engine";
import FederalTrainingStatus from "@/components/FederalTrainingStatus";

const post = (body: object) => POST(new NextRequest("http://localhost/api/conditional-requirements", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}));
beforeEach(() => {
  db.physicianLicense.findMany.mockResolvedValue([]);
  db.user.update.mockResolvedValue({ id: "user" });
});

test.each([
  [{ CONTROLLED_SUBSTANCES: "no" }, undefined, false],
  [{ CONTROLLED_SUBSTANCES: "no" }, "yes", false],
  [{ CONTROLLED_SUBSTANCES: "yes" }, "yes", true],
  [{ CONTROLLED_SUBSTANCES: "yes" }, "no", false],
  [{ CONTROLLED_SUBSTANCES: "yes" }, undefined, undefined],
  [{ CONTROLLED_SUBSTANCES: "yes" }, "maybe", undefined],
  [{}, "yes", undefined],
  [{ GERIATRIC_PANEL: "yes" }, "yes", undefined],
])("setup answers %j with follow-up %j settle the DEA registration as %j", (answers, followUp, expected) => {
  expect(deaRegistrationFromSetup(answers, followUp)).toBe(expected);
});

test("a setup 'no' is stored as not DEA-registered, once, on the user", async () => {
  expect((await post({ answers: { CONTROLLED_SUBSTANCES: "no" } })).status).toBe(200);
  expect(db.user.update).toHaveBeenCalledTimes(1);
  expect(db.user.update).toHaveBeenCalledWith({ where: { id: "user" }, data: { hasDeaRegistration: false } });
});
test("a setup 'yes' with the own-registration follow-up is stored as DEA-registered and records no training", async () => {
  expect((await post({ answers: { CONTROLLED_SUBSTANCES: "yes" }, deaRegistration: "yes" })).status).toBe(200);
  expect(db.user.update).toHaveBeenCalledWith({ where: { id: "user" }, data: { hasDeaRegistration: true } });
  expect(db.federalTrainingRecord.upsert).not.toHaveBeenCalled();
  expect(db.federalTrainingRecord.create).not.toHaveBeenCalled();
});
test("an unsettled answer leaves the federal record unanswered", async () => {
  await post({ answers: { CONTROLLED_SUBSTANCES: "yes" } });
  await post({ answers: {} });
  await post({ answers: { GERIATRIC_PANEL: "no" }, deaRegistration: "yes" });
  expect(db.user.update).not.toHaveBeenCalled();
});

test("the federal row says what is still missing once the DEA answer is known", () => {
  const unanswered = evaluateFederalTraining({ record: null, registered: null, deadline: null });
  const registered = evaluateFederalTraining({ record: null, registered: true, deadline: null });
  expect(unanswered).toMatchObject({ status: "UNKNOWN", federalNeeds: "DEA_ANSWER" });
  expect(registered).toMatchObject({ status: "UNKNOWN", federalNeeds: "TRAINING_RECORD" });
  expect(renderToStaticMarkup(FederalTrainingStatus({ requirement: unanswered }))).toContain("Needs your answer");
  const row = renderToStaticMarkup(FederalTrainingStatus({ requirement: registered }));
  expect(row).toContain("DEA-registered · add your training record");
  expect(row).not.toContain("Needs your answer");
  // Settled statuses carry no pending-answer marker.
  for (const settled of [
    evaluateFederalTraining({ record: null, registered: false, deadline: null }),
    evaluateFederalTraining({ record: null, registered: true, deadline: new Date("2024-01-01") }),
    evaluateFederalTraining({ record: { kind: "MATE_ACT" }, registered: true, deadline: null }),
  ]) expect(settled.federalNeeds).toBeUndefined();
});
