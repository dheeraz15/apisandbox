import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/nav";
import { AnnouncementBar } from "@/components/marketing/announcement-bar";

export type FeaturePageProps = {
  title: string;
  description: string;
  eyebrow: string;
  bullets: string[];
  code?: string;
};

export function FeaturePage({
  title,
  description,
  eyebrow,
  bullets,
  code,
}: FeaturePageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnnouncementBar />
      <MarketingNav />
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,oklch(1_0_0_/10%),transparent)]"
          />
          <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">{description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg" className="h-11">
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="h-11">
                  Docs
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16">
          <ul className="space-y-4">
            {bullets.map((b) => (
              <li
                key={b}
                className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground"
              >
                <span className="text-foreground">{b}</span>
              </li>
            ))}
          </ul>
          {code && (
            <pre className="mt-10 overflow-x-auto rounded-xl border border-border bg-[#0a0a0a] p-5 font-mono text-[12px] leading-relaxed text-muted-foreground">
              <code>{code}</code>
            </pre>
          )}
          <div className="mt-12 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/features/mock-apis" className="hover:text-foreground">
              Mock APIs
            </Link>
            <Link href="/features/custom-domains" className="hover:text-foreground">
              Domains
            </Link>
            <Link href="/features/analytics" className="hover:text-foreground">
              Analytics
            </Link>
            <Link href="/features/webhooks" className="hover:text-foreground">
              Webhooks
            </Link>
            <Link href="/features/openapi" className="hover:text-foreground">
              OpenAPI
            </Link>
            <Link href="/features/security" className="hover:text-foreground">
              Security
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export function featureMetadata(
  title: string,
  description: string
): Metadata {
  return {
    title: `${title} — backendruntime`,
    description,
    openGraph: { title: `${title} — backendruntime`, description },
  };
}
