import { PublicShell } from "@/components/PublicSiteShell";

export default function TermsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="public-heading mb-2 text-4xl">Terms of Service</h1>
        <p className="mb-10 text-sm text-[#6b7568]">Last updated: May 2026</p>

        <div className="max-w-none space-y-8 text-[#3f4a40]">

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">1. Acceptance of Terms</h2>
            <p>By accessing or using ClearCME (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">2. Description of Service</h2>
            <p>ClearCME is a continuing medical education (CME) compliance tracking tool designed to help licensed physicians monitor their CME credit accumulation, organize certificates, export audit-ready records, and identify potential gaps relative to state licensing requirements. The Service provides informational tracking and reminders only.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">3. Important Disclaimer</h2>
            <p className="font-medium text-[#1e2920]">ClearCME is not a substitute for direct communication with your state medical licensing board.</p>
            <p className="mt-2">CME requirements change frequently. While we strive to maintain accurate and current information, ClearCME makes no warranties regarding the completeness, accuracy, or timeliness of the compliance data provided. You are solely responsible for verifying your specific requirements with your state licensing authority and ensuring your own compliance.</p>
            <p className="mt-2">ClearCME does not provide medical advice, legal advice, tax advice, or legal/regulatory representation. Nothing in the Service constitutes a guarantee of licensure compliance, board acceptance, renewal approval, or audit outcome.</p>
            <p className="mt-2">You remain responsible for reviewing source documents, correcting uploaded certificate data, maintaining original CME records, and submitting any required attestations or documentation to your licensing board.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">4. User Accounts</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You may not share your account with others.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">5. Acceptable Use</h2>
            <p>You agree to use ClearCME only for lawful purposes and in accordance with these Terms. You may not use the Service to upload fraudulent CME certificates, misrepresent credentials, or interfere with the Service&rsquo;s operation.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">6. Subscriptions, Billing, and Refunds</h2>
            <p>Paid plans are billed through our payment processor. Subscription access begins after successful checkout and continues until canceled. You may cancel future renewals from your account or by contacting support.</p>
            <p className="mt-2">If ClearCME does not work as expected, contact us within 14 days of purchase at <a href="mailto:hello@clearcme.ai" className="text-[#3f5f33] hover:underline">hello@clearcme.ai</a>. We will either help resolve the issue or provide a reasonable refund when appropriate. Refunds are not guaranteed for accounts that have materially used export, reporting, or compliance-analysis features, but we will handle early-launch issues in good faith.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">7. Support</h2>
            <p>Support is available by email at <a href="mailto:hello@clearcme.ai" className="text-[#3f5f33] hover:underline">hello@clearcme.ai</a>. We aim to respond promptly, but support communications do not create a physician-patient, attorney-client, or regulatory-advisory relationship.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">8. Intellectual Property</h2>
            <p>All content, features, and functionality of ClearCME — including but not limited to the compliance database, user interface, and software — are owned by ClearCME and protected by applicable intellectual property laws.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, ClearCME shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including any licensing issues, missed deadlines, board audits, renewal delays, or professional consequences resulting from reliance on information provided by the Service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">10. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">11. Contact</h2>
            <p>Questions about these Terms, billing, or support? Contact us at <a href="mailto:hello@clearcme.ai" className="text-[#3f5f33] hover:underline">hello@clearcme.ai</a>.</p>
          </section>

        </div>
      </div>
    </PublicShell>
  );
}
