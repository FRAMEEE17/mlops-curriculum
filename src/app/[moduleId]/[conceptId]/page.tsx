import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { modules } from "@/data/curriculum";
import { withBasePath } from "@/lib/basePath";

export function generateStaticParams() {
  return modules.flatMap((m) =>
    m.concepts.map((c) => ({ moduleId: m.id, conceptId: c.id }))
  );
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ moduleId: string; conceptId: string }>;
}) {
  const { moduleId, conceptId } = await params;
  const mod = modules.find((m) => m.id === moduleId);
  const concept = mod?.concepts.find((c) => c.id === conceptId);
  if (!mod || !concept) notFound();

  const idx = mod.concepts.findIndex((c) => c.id === conceptId);
  const prev = mod.concepts[idx - 1];
  const next = mod.concepts[idx + 1];

  return (
    <article className="space-y-8">
      <div>
        <Link
          href={`/${mod.id}/`}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ← {mod.name}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {concept.name}
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-[var(--accent)]">
          {concept.hook}
        </p>
      </div>

      <div className="space-y-4">
        {concept.body.map((p, i) => (
          <p key={i} className="text-[15px] leading-7 text-[var(--text)]">
            {p}
          </p>
        ))}
      </div>

      {concept.figure ? (
        <figure className="space-y-2">
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-raised)]">
            <Image
              src={withBasePath(concept.figure.src)}
              alt={concept.figure.caption}
              width={1200}
              height={800}
              className="h-auto w-full"
            />
          </div>
          <figcaption className="text-xs text-[var(--text-muted)]">
            {concept.figure.caption}
          </figcaption>
        </figure>
      ) : null}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Why it matters
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {concept.whyItMatters}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-6 text-sm">
        {prev ? (
          <Link
            href={`/${mod.id}/${prev.id}/`}
            className="text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/${mod.id}/${next.id}/`}
            className="text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {next.name} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}
