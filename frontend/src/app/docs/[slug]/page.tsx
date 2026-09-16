import { notFound } from "next/navigation";
import { DocsShell } from "@/components/docs/docs-shell";
import { DOC_SECTIONS, getDoc } from "@/lib/docs-content";

export function generateStaticParams() {
  return DOC_SECTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  return {
    title: doc.title,
    description: doc.description,
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOC_SECTIONS.find((s) => s.slug === slug);
  if (!doc) notFound();

  return (
    <DocsShell activeSlug={doc.slug}>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Docs
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{doc.title}</h1>
      <p className="mt-2 text-muted-foreground">{doc.description}</p>
      <article className="prose-docs mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        {doc.body.split("\n\n").map((para, i) => (
          <p key={i} className="whitespace-pre-wrap text-foreground/90">
            {para}
          </p>
        ))}
      </article>
    </DocsShell>
  );
}
