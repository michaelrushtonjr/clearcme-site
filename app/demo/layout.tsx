import DemoShell from "@/components/console/DemoShell";

export const metadata = {
  title: "Demo — ClearCME",
  description:
    "ClearCME with sample data: three credentials, every requirement mapped, and the exact hours still to log. No sign-up required.",
  robots: { index: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoShell>{children}</DemoShell>;
}
