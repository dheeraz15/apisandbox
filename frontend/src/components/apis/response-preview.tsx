"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Props = {
  /** The draft response body, templates and all. */
  body: unknown;
  /** Seed from the endpoint's behavior, so the preview matches what ships. */
  seed?: number | null;
  /** Stand-in request used to resolve {{request.*}} placeholders. */
  sampleRequest?: Record<string, unknown>;
};

/**
 * Renders the draft response through the real template engine.
 *
 * Templates are guesswork until you see them resolved: a list of ten generated
 * customers looks nothing like the three lines that produce it. This asks the
 * backend to render the draft, so what you see is what the endpoint will
 * actually return.
 */
export function ResponsePreview({ body, seed, sampleRequest }: Props) {
  const [rendered, setRendered] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.apis.previewTemplate({
        body,
        behavior: { seed: seed ?? null },
        request: sampleRequest,
      });
      setRendered(res.rendered);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not render the preview");
    } finally {
      setLoading(false);
    }
  }, [body, seed, sampleRequest]);

  // Debounced so it does not fire on every keystroke in the editor.
  useEffect(() => {
    const t = window.setTimeout(run, 400);
    return () => window.clearTimeout(t);
  }, [run]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Rendered response
        </p>
        <Button
          size="xs"
          variant="ghost"
          className="h-6 text-[11px]"
          onClick={run}
          disabled={loading}
          title={
            seed
              ? "This endpoint has a seed, so the output is the same every time"
              : "Generate a fresh sample"
          }
        >
          <RefreshCw className={loading ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
          {seed ? "Seeded" : "Regenerate"}
        </Button>
      </div>

      {error ? (
        <p className="rounded border border-border bg-muted/20 p-2 text-[11px] text-red-400">
          {error}
        </p>
      ) : (
        <pre className="max-h-72 overflow-auto rounded bg-background p-2 font-mono text-[11px] leading-relaxed">
          {rendered === null
            ? "Rendering…"
            : JSON.stringify(rendered, null, 2)}
        </pre>
      )}
    </div>
  );
}
