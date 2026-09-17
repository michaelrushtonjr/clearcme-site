import { PublicShell } from "@/components/PublicSiteShell";

export const metadata = {
  title: "Support — ClearCME",
  description: "Get help with ClearCME on the web or the iPhone app: signing in, certificates, renewal alerts, and deleting your account.",
  alternates: { canonical: "/support" },
};

const topics: { question: string; answer: React.ReactNode }[] = [
  {
    question: "How do I sign in on the iPhone app?",
    answer: (
      <>Use the same method you use on the web: Apple, Google, or your email address. With email, the app sends a 6-digit code to the address on your account. Codes expire after 10 minutes.</>
    ),
  },
  {
    question: "How do I add a certificate?",
    answer: (
      <>Open Upload and choose a PDF or a photo of the certificate. ClearCME reads the title, provider, date, and hours, and you confirm them before anything counts. You can also enter a completion by hand. Never upload patient information.</>
    ),
  },
  {
    question: "A requirement looks wrong for my state.",
    answer: (
      <>Tell us which state, license type, and requirement. Every rule is tied to a primary source and a date checked, and we correct confirmed errors quickly. Your state medical board remains the final authority.</>
    ),
  },
  {
    question: "How do renewal alerts work?",
    answer: (
      <>The iPhone app can notify you as a renewal approaches (60, 45, 30, 21, 14, 7, 3, and 1 day out). Turn notifications on or off in iOS Settings → Notifications → ClearCME. Email reminders are controlled in ClearCME Settings.</>
    ),
  },
  {
    question: "How do I delete my account?",
    answer: (
      <>Go to Settings → Delete account, on the web or in the app. Deletion is immediate and permanent: licenses, certificates, uploaded documents, and compliance history are removed, and any active subscription is canceled so it will not renew.</>
    ),
  },
];

export default function SupportPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="public-heading mb-2 text-4xl">Support</h1>
        <p className="mb-10 text-[#3f4a40]">
          Email{" "}
          <a href="mailto:hello@clearcme.ai" className="text-[#3f5f33] hover:underline">hello@clearcme.ai</a>{" "}
          and a person will answer. Include your state and license type if your question is about a requirement.
        </p>

        <div className="space-y-8 text-[#3f4a40]">
          {topics.map((topic) => (
            <section key={topic.question}>
              <h2 className="mb-2 text-xl font-semibold text-[#1e2920]">{topic.question}</h2>
              <p>{topic.answer}</p>
            </section>
          ))}
          <section>
            <p className="text-sm text-[#6b7568]">
              ClearCME is a tracking tool, not legal or licensing advice. Confirm anything that matters with your state medical board.
            </p>
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
