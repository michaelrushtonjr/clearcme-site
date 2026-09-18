import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicSiteShell";
import { Breadcrumbs, Byline, Faqs, JsonLd, RecordCta } from "@/components/seo/Editorial";
import { getStateGuide, publishedStateGuides, type StateGuide } from "@/lib/state-guides";
import { articleSchema, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return publishedStateGuides.map(({ slug }) => ({ state: slug })); }
export async function generateMetadata({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const guide = getStateGuide(state);
  return guide ? pageMetadata(guide.title, guide.description, `/cme-requirements/${state}`) : { title: "Guide not available", robots: { index: false, follow: false } };
}
function Sources({ ids, guide }: { ids: string[]; guide: StateGuide }) {
  return <p className="mt-3 text-xs leading-6 text-[#596650]">Sources: {ids.map((id, i) => <span key={id}>{i > 0 && " · "}<a className="underline underline-offset-4" href={`#source-${id}`}>{guide.sources.find((source) => source.id === id)?.label}</a></span>)}</p>;
}
export default async function StateRequirementsPage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const guide = getStateGuide(state);
  if (!guide) notFound();
  return <PublicShell><article className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
    <JsonLd data={articleSchema(`${guide.name} CME Requirements for Physicians`, `/cme-requirements/${state}`, guide.modified)} />
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "CME requirements", href: "/cme-requirements" }, { label: guide.name, href: `/cme-requirements/${state}` }]} />
    <header className="max-w-3xl py-10"><div className="public-kicker mb-5">2026 physician guide · MD &amp; DO</div><h1 className="public-heading text-4xl sm:text-6xl">{guide.name} CME requirements for physicians</h1><p className="public-subhead mt-6">{guide.summary}</p><Byline verified={guide.verified} modified={guide.modified} /></header>
    <nav aria-label="On this page" className="mb-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[#3f5f33]"><a href="#at-a-glance">At a glance ↓</a><a href="#mandatory-topics">Mandatory topics ↓</a><a href="#questions">Questions ↓</a><a href="#primary-sources">Primary sources ↓</a></nav>
    <section id="at-a-glance" className="mb-12"><h2 className="public-heading mb-6 text-3xl">At a glance</h2><div className={`grid gap-5 ${guide.boards.length > 1 ? "md:grid-cols-2" : ""}`}>{guide.boards.map((board) => <div key={board.label} className="public-card p-7"><h3 className="font-semibold text-[#596650]">{board.label}</h3><p className="my-5 text-2xl font-semibold text-[#1e2920]">{board.hours}</p><dl className="space-y-4 text-sm leading-6"><div><dt className="font-bold">Renewal cycle</dt><dd>{board.cycle}</dd></div><div><dt className="font-bold">Accepted credit types</dt><dd>{board.credit}</dd></div></dl></div>)}</div></section>
    <div className="max-w-3xl space-y-12">
      <section id="mandatory-topics"><h2 className="public-heading mb-6 text-3xl">Mandatory topics</h2><div className="space-y-5">{guide.topics.map((topic) => <div key={topic.title} className="border-l-2 border-[#bfd1ad] pl-5"><h3 className="text-lg font-bold">{topic.title}</h3><p className="mt-2 leading-7 text-[#3f4a40]">{topic.detail}</p>{topic.course && <Link className="mt-3 inline-block text-sm font-semibold underline underline-offset-4 text-[#3f5f33]" href={`/courses/${topic.course}`}>Explore related courses →</Link>}<Sources ids={topic.sources} guide={guide} /></div>)}</div><p className="mt-6 rounded-xl bg-[#ece4cf]/50 p-4 text-sm leading-6">A related-topic link helps you find courses. It does not establish that a particular activity satisfies this state’s requirement. Verify the accepted provider, category, content and dates before enrolling.</p></section>
      {guide.sections.map((section) => <section key={section.title}><h2 className="public-heading mb-5 text-3xl">{section.title}</h2>{section.paragraphs.map((p) => <p key={p} className="mt-4 leading-7 text-[#3f4a40]">{p}</p>)}<Sources ids={section.sources} guide={guide} /></section>)}
      <aside className="public-card p-6"><h2 className="text-xl font-bold">Federal training has its own clock</h2><p className="mt-3 leading-7">The DEA MATE Act is separate from state renewal. Review the one-time training requirement, qualifying pathways and first applicable registration deadline.</p><Link href="/mate-act" className="mt-4 inline-block font-semibold underline underline-offset-4">Read the DEA MATE Act guide →</Link></aside>
      <Faqs items={guide.faqs} />
      <RecordCta note={guide.productNote} />
      <section id="primary-sources"><h2 className="public-heading mb-5 text-3xl">Primary sources</h2><p className="mb-5 text-sm leading-6 text-[#596650]">Board guidance and controlling law support this guide. Your board’s current rules and individual determination govern your renewal.</p><ol className="space-y-5">{guide.sources.map((source) => <li id={`source-${source.id}`} key={source.id} className="scroll-mt-8"><a href={source.url} className="font-semibold underline underline-offset-4 text-[#3f5f33]">{source.label} ↗</a>{source.quote && <blockquote className="mt-2 border-l-2 border-[#bfd1ad] pl-4 text-sm leading-6">“{source.quote}”</blockquote>}</li>)}</ol></section>
      <section><h2 className="public-heading mb-5 text-3xl">Licensed in another state?</h2><ul className="flex flex-wrap gap-4">{guide.related.map((slug) => { const related = getStateGuide(slug); return related ? <li key={slug}><Link className="public-btn-secondary" href={`/cme-requirements/${slug}`}>{related.name} requirements →</Link></li> : null; })}</ul><p className="mt-6"><Link className="underline underline-offset-4" href="/guides/multi-state-cme-requirements">Build a plan for multiple state licenses →</Link></p></section>
    </div>
  </article></PublicShell>;
}
