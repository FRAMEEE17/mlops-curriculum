import Link from "next/link";
import { curriculumIntro, curriculumName, modules } from "@/data/curriculum";

export default function Home() {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {curriculumName}
        </h1>
        {curriculumIntro.map((p, i) => (
          <p key={i} className="text-[15px] leading-7 text-[var(--text-muted)]">
            {p}
          </p>
        ))}
      </div>

      <div className="space-y-3">
        {modules.map((m) => (
          <Link
            key={m.id}
            href={`/${m.id}/`}
            className="block rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-5 transition hover:border-[var(--accent-dim)]"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-base font-medium">
                <span className="mr-2 text-[var(--text-muted)]">
                  {String(m.order).padStart(2, "0")}
                </span>
                {m.name}
              </h2>
              <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">
                {m.concepts.length} write-ups
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {m.intro}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
