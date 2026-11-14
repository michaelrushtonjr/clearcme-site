import Link from "next/link";
import { PublicShell } from "@/components/PublicSiteShell";
import { Breadcrumbs, JsonLd } from "@/components/seo/Editorial";
import { AUTHOR_PATH, SITE_URL, author, pageMetadata } from "@/lib/seo";

// Pre-sized files cut by design/founder-photo/generate.mjs: 160x200 on phones,
// 200x250 from 640px up, with sharper copies for high-density screens.
const PORTRAIT = "/images/founder/michael-rushton-portrait";
function FounderPortrait() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="mb-8 h-[200px] w-[160px] rounded-[14px] border border-[#ddd4bd] bg-[#ece4cf] object-cover sm:h-[250px] sm:w-[200px]"
      src={`${PORTRAIT}-400.jpg`}
      srcSet={`${PORTRAIT}-200.jpg 200w, ${PORTRAIT}-400.jpg 400w, ${PORTRAIT}-600.jpg 600w`}
      sizes="(min-width: 640px) 200px, 160px"
      width={200}
      height={250}
      alt="Michael Rushton, DO"
      decoding="async"
    />
  );
}

export const metadata = pageMetadata("Michael Rushton, DO — Physician Founder of ClearCME", "Meet Michael Rushton, DO, the physician founder and author behind ClearCME’s state CME guides and primary-source verification approach.", AUTHOR_PATH);
export default function AuthorPage() {
  return <PublicShell><article className="mx-auto max-w-3xl px-6 py-12"><JsonLd data={{ "@context": "https://schema.org", ...author, image: `${SITE_URL}${PORTRAIT}-600.jpg`, description: "Physician founder of ClearCME and author of its physician CME requirement guides." }} /><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Michael Rushton, DO", href: AUTHOR_PATH }]} /><header className="py-10"><FounderPortrait /><div className="public-kicker mb-5">Physician founder &amp; author</div><h1 className="public-heading text-4xl sm:text-6xl">Michael Rushton, DO</h1><p className="public-subhead mt-6">An emergency medicine physician building ClearCME to make CME requirements and records easier to manage.</p></header><div className="space-y-8 leading-7"><section><h2 className="public-heading text-3xl mb-4">Why ClearCME exists</h2><p>Keeping a physician license current involves more than adding up hours. Different state boards use different categories, mandatory topics and renewal schedules. ClearCME brings requirements, completion history and certificates into one place.</p></section><section><h2 className="public-heading text-3xl mb-4">Editorial responsibility</h2><p>Michael authors ClearCME’s educational guides. The guides build on documented research from medical boards, statutes and administrative rules. Each guide identifies its primary sources and last verification date.</p><p className="mt-4">Source verification dates describe when the source-backed guidance was checked. They do not imply board endorsement, an individual medical-board determination or that every scenario is calculated by the product.</p><Link href="/methodology" className="mt-4 inline-block font-semibold underline">Read the verification methodology →</Link></section><section><h2 className="public-heading text-3xl mb-4">Guides and resources</h2><ul className="space-y-3 underline underline-offset-4"><li><Link href="/cme-requirements">Physician CME requirements by state</Link></li><li><Link href="/mate-act">DEA MATE Act training requirement</Link></li><li><Link href="/physician-cme-tracker">How ClearCME helps organize physician CME</Link></li></ul></section><section><h2 className="public-heading text-3xl mb-4">Corrections</h2><p>If you find a change or discrepancy, include the state, license type and official source when contacting <Link className="underline" href="/support">ClearCME support</Link>. We review reported discrepancies against official sources and explain any effect on the guide or tracker.</p></section></div></article></PublicShell>;
}
