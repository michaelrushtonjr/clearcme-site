import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 px-6 py-4 max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-slate-900 tracking-tight">
          Clear<span className="text-blue-600">CME</span>
        </Link>
        <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700">
          Sign in →
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: April 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. What We Collect</h2>
            <p>When you use ClearCME, we collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Account information</strong> — your name and email address, provided via Google Sign-In</li>
              <li><strong>License information</strong> — state(s) of licensure, license type (MD/DO), and renewal dates you enter</li>
              <li><strong>CME certificates</strong> — files you upload and the extracted data (course title, provider, credit hours, date)</li>
              <li><strong>Usage data</strong> — standard web analytics (page views, feature usage) to improve the product</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. How We Use Your Data</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide compliance tracking and gap analysis personalized to your licenses</li>
              <li>Send renewal reminders and compliance alerts (if opted in)</li>
              <li>Improve the accuracy of our compliance database</li>
              <li>Communicate product updates</li>
            </ul>
            <p className="mt-3">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. HIPAA Notice</h2>
            <p>ClearCME is a CME compliance tracking tool. <strong>We do not store Protected Health Information (PHI)</strong> as defined by HIPAA. CME certificates and physician licensing information are not medical records and are not subject to HIPAA. ClearCME is not a covered entity under HIPAA.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Google Sign-In</h2>
            <p>We use Google OAuth for authentication. When you sign in with Google, we receive your name and email address. We do not access your Google contacts, Gmail, Drive, or any other Google services. For more information, see <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google&rsquo;s Privacy Policy</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Data Storage & Security</h2>
            <p>Your data is stored in a secured PostgreSQL database hosted in the United States. We use industry-standard encryption for data in transit (HTTPS/TLS) and at rest. Access to your data is restricted to you and authorized ClearCME systems.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Third-Party Partners</h2>
            <p>ClearCME may recommend CME courses from partner providers (such as Hippo Education and CME Outfitters). When you click through to a partner&rsquo;s site, their privacy policy applies. We may receive referral commissions from partners, but we do not share your personal data with them.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at <a href="mailto:hello@clearcme.ai" className="text-blue-600 hover:underline">hello@clearcme.ai</a>. Account deletion will remove all associated data within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a notice in the app. Continued use of ClearCME after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Contact</h2>
            <p>Questions about your privacy? Contact us at <a href="mailto:hello@clearcme.ai" className="text-blue-600 hover:underline">hello@clearcme.ai</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex gap-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <Link href="/terms" className="hover:text-slate-600">Terms of Service</Link>
          <Link href="/login" className="hover:text-slate-600">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
