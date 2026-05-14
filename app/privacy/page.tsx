import { PublicShell } from "@/components/PublicSiteShell";

export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="public-heading mb-2 text-4xl">Privacy Policy</h1>
        <p className="mb-10 text-sm text-[#6b7568]">Last updated: May 2026</p>

        <div className="max-w-none space-y-8 text-[#3f4a40]">

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">1. What We Collect</h2>
            <p>When you use ClearCME, we collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Account information</strong> — your name and email address, provided via Google Sign-In</li>
              <li><strong>License information</strong> — state(s) of licensure, license type (MD/DO), and renewal dates you enter</li>
              <li><strong>CME certificates</strong> — files you upload and the extracted data (course title, provider, credit hours, date)</li>
              <li><strong>Billing information</strong> — subscription status and payment identifiers handled through our payment processor; we do not store full card numbers</li>
              <li><strong>Usage data</strong> — standard web analytics (page views, feature usage) to improve the product</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">2. How We Use Your Data</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide compliance tracking and gap analysis personalized to your licenses</li>
              <li>Send renewal reminders and compliance alerts (if opted in)</li>
              <li>Improve the accuracy of our compliance database</li>
              <li>Communicate product updates, billing notices, and support responses</li>
            </ul>
            <p className="mt-3">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">3. HIPAA Notice</h2>
            <p>ClearCME is a CME compliance tracking tool. <strong>We do not intentionally collect or store Protected Health Information (PHI)</strong> as defined by HIPAA. CME certificates and physician licensing information are professional compliance records, not patient medical records. ClearCME is not a covered entity under HIPAA.</p>
            <p className="mt-3">Please do not upload patient charts, patient identifiers, clinical photographs, or other patient-specific information. If you believe PHI was uploaded accidentally, contact us promptly so we can help remove it.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">4. Google Sign-In</h2>
            <p>We use Google OAuth for authentication. When you sign in with Google, we receive your name and email address. We do not access your Google contacts, Gmail, Drive, or any other Google services. For more information, see <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#3f5f33] hover:underline">Google&rsquo;s Privacy Policy</a>.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">5. Data Storage & Security</h2>
            <p>Your data is stored in a secured PostgreSQL database hosted in the United States. We use industry-standard encryption for data in transit (HTTPS/TLS) and at rest. Access to your data is restricted to you and authorized ClearCME systems and service providers needed to operate the product.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">6. Third-Party Partners</h2>
            <p>ClearCME may recommend CME courses from partner providers. When you click through to a partner&rsquo;s site, their privacy policy applies. We may receive referral commissions from paid partners, but we do not sell your personal data or share your uploaded certificate data with course providers for advertising.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">7. Your Rights</h2>
            <p>You may request access to, correction of, export of, or deletion of your personal data at any time by contacting us at <a href="mailto:hello@clearcme.ai" className="text-[#3f5f33] hover:underline">hello@clearcme.ai</a>. Account deletion will remove associated active account data within 30 days, except where limited backup retention, fraud prevention, tax, accounting, security, or legal obligations require temporary retention.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a notice in the app. Continued use of ClearCME after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1e2920]">9. Contact</h2>
            <p>Questions about your privacy, data, or account deletion? Contact us at <a href="mailto:hello@clearcme.ai" className="text-[#3f5f33] hover:underline">hello@clearcme.ai</a>.</p>
          </section>

        </div>
      </div>
    </PublicShell>
  );
}
