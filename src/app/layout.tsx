import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { curriculumName } from "@/data/curriculum";

export const metadata: Metadata = {
  title: curriculumName,
  description:
    "A study plan for MLOps at a credit and lending fintech: Kubernetes, ML lifecycle automation, A/B testing on credit decisions, fairness monitoring, and the problem-solving playbook the interviews actually run on.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-[var(--border)]">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              {curriculumName}
            </Link>
            <span className="text-xs text-[var(--text-muted)]">
              9 modules · 35 write-ups
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>
      </body>
    </html>
  );
}
