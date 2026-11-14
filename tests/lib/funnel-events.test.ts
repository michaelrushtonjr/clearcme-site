import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("not found"); }) }));
import CourseDiscoveryPage from "@/app/courses/[topic]/page";
import { GapCourseFeed } from "@/components/dashboard/GapCourseFeed";
import { FUNNEL_EVENTS, enrollClickAttrs, eventFromDataset, stateFromGuidePath } from "@/lib/funnel-events";
import { publishedStateGuides } from "@/lib/state-guides";

/** What the browser hands the listener: data-track-topic arrives as dataset.trackTopic. */
function dataset(attrs: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(attrs).map(([name, value]) => [
      name.replace(/^data-/, "").replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  );
}
/** The data-track attributes of the first link in rendered HTML that carries one. */
function firstTracked(html: string): Record<string, string> {
  const tag = html.match(/<a\b[^>]*data-track="[^"]*"[^>]*>/)?.[0] ?? "";
  return Object.fromEntries([...tag.matchAll(/(data-track[a-z-]*)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

test("an Enroll link's attributes come back as enroll_click with state, topic and course", () => {
  const attrs = enrollClickAttrs({ topic: "PATIENT_SAFETY", course: "Medical Errors 2026", provider: "Example Health", state: "fl", surface: "compliance_map" });
  expect(eventFromDataset(dataset(attrs))).toEqual({
    event: "enroll_click",
    props: { topic: "PATIENT_SAFETY", course: "Medical Errors 2026", provider: "Example Health", state: "FL", surface: "compliance_map" },
  });
});

test("a public Enroll link carries no state; the listener fills in the last state viewed", () => {
  const attrs = enrollClickAttrs({ topic: "CHILD_ABUSE", course: "Act 31 Training", surface: "course_page" });
  expect(attrs).not.toHaveProperty("data-track-state");
  expect(eventFromDataset(dataset(attrs))?.props).toEqual({ topic: "CHILD_ABUSE", course: "Act 31 Training", surface: "course_page" });
});

test("markup cannot record server-side events, and untracked elements are ignored", () => {
  expect(eventFromDataset({})).toBeNull();
  expect(eventFromDataset({ track: "purchase", trackPlan: "pro" })).toBeNull();
  expect(eventFromDataset({ track: "something_else" })).toBeNull();
});

test("a state guide path gives its state; every published guide resolves", () => {
  expect(stateFromGuidePath("/cme-requirements/pennsylvania")).toBe("PA");
  expect(stateFromGuidePath("/cme-requirements/new-york")).toBe("NY");
  expect(stateFromGuidePath("/cme-requirements")).toBeNull();
  expect(stateFromGuidePath("/courses/patient-safety")).toBeNull();
  for (const guide of publishedStateGuides) expect(stateFromGuidePath(`/cme-requirements/${guide.slug}`)).toBe(guide.code);
});

test("the public course page marks every Enroll link", async () => {
  const html = renderToStaticMarkup(await CourseDiscoveryPage({ params: Promise.resolve({ topic: "patient-safety" }) }));
  const articles = html.match(/<article/g)?.length ?? 0;
  expect(articles).toBeGreaterThan(0);
  expect(html.match(/data-track="enroll_click"/g)).toHaveLength(articles);
  const declared = eventFromDataset(dataset(firstTracked(html)));
  expect(declared?.props).toMatchObject({ topic: "PATIENT_SAFETY", surface: "course_page" });
  expect(declared?.props.course).toBeTruthy();
  expect(declared?.props.state).toBeUndefined();
});

test("in-app course rows carry the license's state", () => {
  const html = renderToStaticMarkup(GapCourseFeed({ topic: "PATIENT_SAFETY", hoursNeeded: 2, state: "FL" }));
  expect(eventFromDataset(dataset(firstTracked(html)))?.props).toMatchObject({ topic: "PATIENT_SAFETY", state: "FL", surface: "compliance_map" });
});

// Each named event must be recorded somewhere in the app. A rename or a
// deleted call site shows up here instead of as a silent hole in the funnel.
test("every named funnel event is recorded somewhere", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry) && full !== path.join("lib", "funnel-events.ts")) files.push(full);
    }
  };
  ["app", "components", "lib"].forEach(walk);
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  for (const event of FUNNEL_EVENTS) expect(source, event).toContain(`"${event}"`);
});
