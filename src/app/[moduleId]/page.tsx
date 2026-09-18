import Link from "next/link";
import { notFound } from "next/navigation";
import { modules } from "@/data/curriculum";

export function generateStaticParams() {
  return modules.map((m) => ({ moduleId: m.id }));
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
          ← all modules
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {String(mod.order).padStart(2, "0")} · {mod.name}
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-[var(--text-muted)]">
          {mod.intro}
        </p>
      </div>

      <div className="space-y-3">
        {mod.concepts.map((c, i) => (
          <Link
            key={c.id}
            href={`/${mod.id}/${c.id}/`}
            className="block rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-5 transition hover:border-[var(--accent-dim)]"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-base font-medium">
                <span className="mr-2 text-[var(--text-muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {c.name}
              </h2>
              <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">
                ~{c.estimatedHours}h
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--accent)]">{c.hook}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
