"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { MethodBadge } from "@/components/apis/method-badge";
import { api, Analytics } from "@/lib/api";

export function AnalyticsPage({ workspace }: { workspace: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.workspaces
      .analytics(workspace, days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspace, days]);

  if (loading || !data) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader title="Analytics" description="Traffic, latency, and errors across your endpoints" />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  const maxDay = Math.max(...data.by_day.map((d) => d.count), 1);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader
        title="Analytics"
        description={`Last ${days} days · ${data.total_requests.toLocaleString()} requests`}
        action={
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded px-3 py-1.5 transition-colors ${
                  days === d
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
        {[
          { label: "Total requests", value: data.total_requests.toLocaleString() },
          { label: "Error rate", value: `${data.error_rate}%` },
          { label: "Avg latency", value: `${data.avg_latency_ms}ms` },
          { label: "Webhook events", value: data.webhook_deliveries ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="border-r border-border px-6 py-5 last:border-r-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <section className="border-b border-border px-6 py-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Requests by day
        </p>
        <div className="flex h-36 items-end gap-1">
          {data.by_day.length === 0 ? (
            <p className="text-sm text-muted-foreground">No traffic yet</p>
          ) : (
            data.by_day.map((d) => (
              <div key={String(d.day)} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-12 rounded-t bg-foreground/80 transition-all"
                  style={{
                    height: `${Math.max((d.count / maxDay) * 100, d.count ? 4 : 0)}%`,
                    minHeight: d.count ? 4 : 0,
                  }}
                  title={`${d.count} requests`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.day).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid lg:grid-cols-2">
        <AnalyticsPanel title="By endpoint">
          {data.by_api.map((row) => (
            <Link
              key={row.api_id}
              href={`/${workspace}/apis/${row.api_id}`}
              className="flex items-center justify-between border-b border-border px-6 py-3 last:border-0 hover:bg-accent/30 transition-colors"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MethodBadge method={row.api__method} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.api__name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {row.api__endpoint}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right text-xs">
                <p className="tabular-nums font-medium">{row.count}</p>
                <p className="text-muted-foreground">{Math.round(row.avg_latency || 0)}ms</p>
              </div>
            </Link>
          ))}
          {data.by_api.length === 0 && <EmptyState />}
        </AnalyticsPanel>

        <AnalyticsPanel title="By collection" bordered>
          {data.by_collection.map((row) => (
            <div
              key={row.collection_id}
              className="flex justify-between border-b border-border px-6 py-3 last:border-0 text-sm"
            >
              <span>{row.collection__name}</span>
              <span className="tabular-nums text-muted-foreground">{row.count}</span>
            </div>
          ))}
          {data.by_collection.length === 0 && <EmptyState />}
        </AnalyticsPanel>

        <AnalyticsPanel title="Status codes">
          {data.by_status.map((row) => (
            <div
              key={row.status_code}
              className="flex justify-between border-b border-border px-6 py-3 last:border-0 text-sm"
            >
              <span
                className={
                  row.status_code < 300
                    ? "text-emerald-400"
                    : row.status_code < 500
                      ? "text-amber-400"
                      : "text-red-400"
                }
              >
                {row.status_code}
              </span>
              <span className="tabular-nums text-muted-foreground">{row.count}</span>
            </div>
          ))}
          {data.by_status.length === 0 && <EmptyState />}
        </AnalyticsPanel>

        <AnalyticsPanel title="Incoming webhooks" bordered>
          {data.by_webhook?.map((row) => (
            <Link
              key={row.webhook_id}
              href={`/${workspace}/webhooks`}
              className="flex justify-between border-b border-border px-6 py-3 last:border-0 text-sm hover:bg-accent/30"
            >
              <span>{row.webhook__name}</span>
              <span className="tabular-nums text-muted-foreground">{row.count}</span>
            </Link>
          ))}
          {(!data.by_webhook || data.by_webhook.length === 0) && (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              No webhook deliveries in this period
            </p>
          )}
        </AnalyticsPanel>

        <AnalyticsPanel title="Rule findings" bordered>
          {data.by_finding.map((row) => (
            <div
              key={row.finding}
              className="flex justify-between border-b border-border px-6 py-3 last:border-0 text-sm"
            >
              <span className="truncate font-mono text-xs text-amber-400/90">{row.finding}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{row.count}</span>
            </div>
          ))}
          {data.by_finding.length === 0 && <EmptyState />}
        </AnalyticsPanel>
      </div>
    </div>
  );
}

function AnalyticsPanel({
  title,
  children,
  bordered,
}: {
  title: string;
  children: React.ReactNode;
  bordered?: boolean;
}) {
  return (
    <section className={bordered ? "lg:border-l border-border" : ""}>
      <div className="border-b border-border px-6 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <p className="px-6 py-8 text-sm text-muted-foreground">No data yet</p>
  );
}
