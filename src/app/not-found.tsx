import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="text-sm text-[var(--text-muted)]">
        That page doesn&apos;t exist.{" "}
        <Link href="/" className="text-[var(--accent)] hover:underline">
          Back to the modules.
        </Link>
      </p>
    </div>
  );
}
