import Link from "next/link";
import { AUTHOR_PATH, breadcrumbSchema } from "@/lib/seo";

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  return <><JsonLd data={breadcrumbSchema(items)} /><nav aria-label="Breadcrumb" className="text-sm text-[#596650]"><ol className="flex flex-wrap gap-2">{items.map((item, i) => <li key={item.href}>{i > 0 && <span aria-hidden="true" className="mr-2">/</span>}{i === items.length - 1 ? <span aria-current="page">{item.label}</span> : <Link className="underline underline-offset-4" href={item.href}>{item.label}</Link>}</li>)}</ol></nav></>;
}

export function Byline({ verified, modified, published = "2026-09-18" }: { verified?: string; modified: string; published?: string }) {
  return <div className="mt-6 border-t border-[#ddd4bd] pt-4 text-sm leading-7 text-[#596650]">
    <p>By <Link className="font-semibold underline underline-offset-4" href={AUTHOR_PATH}>Michael Rushton, DO</Link> · Physician founder of ClearCME</p>
    {verified && <p>Last verified: <time dateTime={verified}>{verified}</time> · <Link href="/methodology" className="underline underline-offset-4">Verification methodology</Link></p>}
    <p>Published: <time dateTime={published}>{published}</time> · Updated: <time dateTime={modified}>{modified}</time></p>
  </div>;
}

export function Faqs({ items }: { items: { question: string; answer: string }[] }) {
  return <section id="questions" className="space-y-3"><h2 className="public-heading text-3xl mb-6">Questions physicians ask next</h2>{items.map((faq) => <details key={faq.question} className="public-card p-5"><summary className="cursor-pointer font-semibold text-[#1e2920]">{faq.question}</summary><p className="mt-4 leading-7 text-[#3f4a40]">{faq.answer}</p></details>)}</section>;
}

export function RecordCta({ note }: { note: string }) {
  return <aside className="public-card public-card-soft p-7 sm:p-9"><div className="public-kicker mb-4">Keep the proof together</div><h2 className="public-heading text-3xl">Organize your CME records</h2><p className="my-5 leading-7 text-[#3f4a40]">{note}</p><Link href="/login" data-seo-cta="organize-records" className="public-btn-primary">Start your CME record →</Link><p className="mt-4 text-sm leading-6 text-[#596650]">ClearCME is an informational tracking tool. Complete renewal and any required reporting with your board or its designated system.</p></aside>;
}
