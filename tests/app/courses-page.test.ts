import { expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("not found"); }) }));
import CourseDiscoveryPage from "@/app/courses/[topic]/page";
import { COURSE_CATALOG, keyToSlug } from "@/lib/courses";

const slugs = Object.keys(COURSE_CATALOG).filter((key) => COURSE_CATALOG[key].courses.length > 0).map(keyToSlug);
const render = async (topic: string) => renderToStaticMarkup(await CourseDiscoveryPage({ params: Promise.resolve({ topic }) }));

// On a phone the first course has to start inside the first screen, so nothing
// tall may sit between the title and the list. (Measured in a browser at
// 390x844 on 2026-11-14: first card top 432–505 px on all 15 topic pages.)
test.each(slugs)("%s: the course list comes straight after the title", async (slug) => {
  const html = await render(slug);
  const title = html.indexOf("<h1");
  const firstCourse = html.indexOf("<article");
  const caution = html.indexOf('id="before-you-enroll"');
  const footer = html.indexOf("ClearCME may receive a referral commission");
  expect(title).toBeGreaterThan(-1);
  expect(firstCourse).toBeGreaterThan(title);
  expect(caution).toBeGreaterThan(firstCourse);
  expect(footer).toBeGreaterThan(caution);
  const relatedStates = html.indexOf("States where this topic may be relevant");
  if (relatedStates !== -1) expect(relatedStates).toBeGreaterThan(firstCourse);
  // Only the title card (heading, count, one-line caution) sits above the list.
  const aboveList = html.slice(title, firstCourse).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  expect(aboveList.length).toBeLessThan(320);
});

test("the cautions and context stay on the page", async () => {
  const html = await render("patient-safety");
  expect(html).toContain("A topic match does not establish state approval:");
  expect(html).toContain('href="#before-you-enroll"');
  expect(html).toContain("Confirm your board’s provider, content, credit category, completion window and reporting rules before enrolling.");
  expect(html).toContain(`Topic context:</span> ${COURSE_CATALOG.PATIENT_SAFETY.requirement}`);
  expect(html).toContain(`${COURSE_CATALOG.PATIENT_SAFETY.courses.length} courses listed.`);
  expect(await render("substance-use")).toContain("Understand the federal DEA MATE Act requirement");
});

test("a card states each fact once", async () => {
  const html = await render("patient-safety");
  const firstCard = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
  expect(firstCard).not.toContain(">From<");
  expect(firstCard.match(/2\.0 hours · AMA PRA Category 1/g)).toHaveLength(1);
  // "Free" in the pill only; no price row repeating it.
  expect(firstCard).not.toContain(">Price<");
  // A price that says more than its pill keeps its row.
  const childAbuse = await render("child-abuse");
  expect(childAbuse).toContain("Free (free Pri-Med account required)");
});
