import Link from "next/link";
import { DocsShell } from "@/components/docs/docs-shell";
import { DOC_SECTIONS } from "@/lib/docs-content";

export const metadata = {
  title: "Docs",
  description: "Searchable documentation for running and using this mock API server.",
};

export default function DocsIndexPage() {
  return (
    <DocsShell activeSlug="introduction">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Documentation
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Documentation</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Enterprise API validator & mock runtime. Browse topics or search above. Machine-readable
        surfaces:{" "}
        <Link href="/docs/openapi.json" className="text-foreground underline-offset-4 hover:underline">
          OpenAPI
        </Link>
        ,{" "}
        <Link href="/llms.txt" className="text-foreground underline-offset-4 hover:underline">
          llms.txt
        </Link>
        .
      </p>
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {DOC_SECTIONS.map((s) => (
          <Link
            key={s.slug}
            href={`/docs/${s.slug}`}
            className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/30"
          >
            <h2 className="text-sm font-medium">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
          </Link>
        ))}
      </div>
    </DocsShell>
  );
}
