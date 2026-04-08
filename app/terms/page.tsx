import Link from "next/link";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: April 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ClearCME (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Description of Service</h2>
            <p>ClearCME is a continuing medical education (CME) compliance tracking tool designed to help licensed physicians monitor their CME credit accumulation and identify potential gaps relative to state licensing requirements. The Service provides informational tracking and reminders only.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Important Disclaimer</h2>
            <p className="font-medium text-slate-900">ClearCME is not a substitute for direct communication with your state medical licensing board.</p>
            <p className="mt-2">CME requirements change frequently. While we strive to maintain accurate and current information, ClearCME makes no warranties regarding the completeness, accuracy, or timeliness of the compliance data provided. You are solely responsible for verifying your specific requirements with your state licensing authority and ensuring your own compliance.</p>
            <p className="mt-2">ClearCME does not provide medical advice, legal advice, or licensing guidance. Nothing in the Service constitutes a guarantee of licensure compliance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. User Accounts</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You may not share your account with others.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Acceptable Use</h2>
            <p>You agree to use ClearCME only for lawful purposes and in accordance with these Terms. You may not use the Service to upload fraudulent CME certificates, misrepresent credentials, or interfere with the Service&rsquo;s operation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Intellectual Property</h2>
            <p>All content, features, and functionality of ClearCME — including but not limited to the compliance database, user interface, and software — are owned by ClearCME and protected by applicable intellectual property laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, ClearCME shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including any licensing issues resulting from reliance on information provided by the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Contact</h2>
            <p>Questions about these Terms? Contact us at <a href="mailto:hello@clearcme.ai" className="text-blue-600 hover:underline">hello@clearcme.ai</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex gap-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
          <Link href="/login" className="hover:text-slate-600">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
