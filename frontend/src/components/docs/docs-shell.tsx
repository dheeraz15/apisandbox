"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DOC_SECTIONS } from "@/lib/docs-content";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DocsShell({
  activeSlug,
  children,
}: {
  activeSlug: string;
  children: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return DOC_SECTIONS;
    return DOC_SECTIONS.filter((s) => {
      const hay = `${s.title} ${s.description} ${s.keywords.join(" ")} ${s.body}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [q]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-foreground">
              <span className="font-mono text-[9px] font-bold text-background">BR</span>
            </div>
            <span className="text-sm font-medium">Docs</span>
          </Link>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search docs…"
              className="h-8 pl-8"
            />
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
            <Link href="/docs/openapi.json" className="hover:text-foreground">
              OpenAPI
            </Link>
            <Link href="/llms.txt" className="hover:text-foreground">
              llms.txt
            </Link>
            <Link href="/signup" className="text-foreground hover:underline">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-20 md:h-[calc(100vh-6rem)] md:overflow-y-auto">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Guide
          </p>
          <nav className="space-y-0.5">
            {results.map((s) => (
              <Link
                key={s.slug}
                href={`/docs/${s.slug}`}
                className={cn(
                  "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  activeSlug === s.slug
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {s.title}
              </Link>
            ))}
            {results.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">No matches</p>
            )}
          </nav>
        </aside>
        <main className="min-w-0 pb-16">{children}</main>
      </div>
    </div>
  );
}
