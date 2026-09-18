import HomePage from "@/components/HomePage";
import { JsonLd } from "@/components/seo/Editorial";
import { organization, pageMetadata, SITE_URL } from "@/lib/seo";
export const metadata = pageMetadata("Physician CME Tracker & State Requirements | ClearCME", "Track physician CME hours and certificates across multiple state licenses. Explore verified state requirements and related courses with ClearCME.", "/");
export default function Home() { return <><JsonLd data={organization} /><JsonLd data={{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "ClearCME", url: SITE_URL, applicationCategory: "BusinessApplication", operatingSystem: "Web", description: "Physician CME tracking software for organizing state licenses, certificates and recorded completion history." }} /><HomePage /></>; }
