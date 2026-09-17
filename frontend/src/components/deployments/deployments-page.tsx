"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Copy, Loader2, Rocket } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MethodBadge } from "@/components/apis/method-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ApiError, Resource } from "@/lib/api";

type Live =
  | { kind: "endpoint"; id: string; method: string; name: string; url: string }
  | { kind: "resource"; id: string; name: string; url: string; operations: number };

/** Everything this workspace is currently serving, with the URLs to call. */
export function DeploymentsPage({ workspace }: { workspace: string }) {
  const [items, setItems] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [apiList, resources] = await Promise.all([
        api.apis.list(workspace),
        api.resources.list(workspace).catch(() => [] as Resource[]),
      ]);

      const endpoints: Live[] = apiList.results
        .filter((a) => a.is_deployed)
        .map((a) => ({
          kind: "endpoint",
          id: a.id,
          method: a.method,
          name: a.name,
          url: a.deployed_url || a.endpoint,
        }));

      const resourceItems: Live[] = resources
        .filter((r) => r.is_deployed)
        .map((r) => ({
          kind: "resource",
          id: r.id,
          name: r.name,
          url: r.deployed_url,
          operations: r.operations.length,
        }));

      setItems([...endpoints, ...resourceItems]);
    } catch (e) {
      setError(
        e instanceof ApiError && e.isTransient
          ? "Could not reach the API. Is the backend running?"
          : e instanceof Error
            ? e.message
            : "Could not load deployments"
      );
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    load();
  }, [load]);

  const copy = (url: string) => {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(url);
    window.setTimeout(() => setCopied((c) => (c === url ? null : c)), 1400);
  };

  const undeploy = async (item: Live) => {
    setBusy(item.id);
    try {
      if (item.kind === "endpoint") {
        await api.apis.undeploy(item.id);
      } else {
        await api.resources.update(item.id, { is_deployed: false });
      }
      toast.success(`${item.name} is no longer live`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not take it down");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Deployments"
        description="Everything this workspace is serving right now"
      />

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading deployments…
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium">Could not load deployments</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={load}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <Rocket className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-base font-medium">Nothing is live yet</h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
            Deploy an endpoint, or create a resource, and the URLs people can
            call show up here.
          </p>
          <div className="mt-5 flex gap-2">
            <Link href={`/${workspace}/apis`} className={buttonVariants()}>
              Endpoints
            </Link>
            <Link
              href={`/${workspace}/resources`}
              className={buttonVariants({ variant: "outline" })}
            >
              Resources
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="flex flex-wrap items-start gap-3 px-4 py-3"
              >
                {item.kind === "endpoint" ? (
                  <MethodBadge method={item.method} className="mt-px shrink-0" />
                ) : (
                  <span className="mt-px shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    CRUD
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <Link
                    href={
                      item.kind === "endpoint"
                        ? `/${workspace}/apis/${item.id}`
                        : `/${workspace}/resources`
                    }
                    className="truncate text-sm font-medium leading-5 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {item.url}
                  </p>
                  {item.kind === "resource" ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {item.operations} operations
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button size="xs" variant="ghost" onClick={() => copy(item.url)}>
                    {copied === item.url ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy URL
                      </>
                    )}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={busy === item.id}
                    onClick={() => undeploy(item)}
                  >
                    {busy === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    Take down
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
