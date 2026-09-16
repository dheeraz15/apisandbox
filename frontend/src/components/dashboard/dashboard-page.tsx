"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Plus, Activity } from "lucide-react";
import { api, WorkspaceStats, MockAPIListItem, RequestLog } from "@/lib/api";
import { MethodBadge } from "@/components/apis/method-badge";
import { Button } from "@/components/ui/button";
import {
  GettingStarted,
  WelcomeWizard,
  isWizardDone,
  markWizardDone,
} from "@/components/onboarding/getting-started";

export function DashboardPage({ workspace }: { workspace: string }) {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [apis, setApis] = useState<MockAPIListItem[]>([]);
  const [activity, setActivity] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(true);

  useEffect(() => {
    Promise.all([
      api.workspaces.stats(workspace),
      api.apis.list(workspace),
      api.workspaces.activity(workspace),
    ])
      .then(([s, a, act]) => {
        setStats(s);
        setApis(a.results.slice(0, 6));
        setActivity(act);
        if (!isWizardDone(workspace) && (s.active_endpoints === 0 || searchParams.get("welcome") === "1")) {
          setShowWizard(true);
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, [workspace]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const hasEndpoints = (stats?.active_endpoints ?? 0) > 0;
  const hasRequests = (stats?.total_requests ?? 0) > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <WelcomeWizard
        workspace={workspace}
        open={showWizard}
        onClose={() => {
          setShowWizard(false);
          markWizardDone(workspace);
        }}
      />

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-6 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="border-b border-border px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats?.active_endpoints ?? 0} live endpoints · {stats?.requests_today ?? 0} requests today
        </p>
      </div>

      {showGettingStarted && (
        <GettingStarted
          workspace={workspace}
          hasEndpoints={hasEndpoints}
          hasRequests={hasRequests}
          onDismiss={() => {
            setShowGettingStarted(false);
            markWizardDone(workspace);
          }}
        />
      )}

      <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
        {[
          { label: "Endpoints", value: stats?.api_count ?? 0 },
          { label: "Live", value: stats?.active_endpoints ?? 0 },
          { label: "Requests today", value: stats?.requests_today ?? 0 },
          { label: "Total requests", value: stats?.total_requests ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="border-r border-border px-6 py-5 last:border-r-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2">
        <section className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Endpoints
            </span>
            <Link href={`/${workspace}/apis/new`}>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                <Plus className="h-3 w-3" /> New
              </Button>
            </Link>
          </div>
          {apis.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No endpoints yet</p>
              <Link href={`/${workspace}/apis/new`}>
                <Button size="sm" className="mt-4">Create your first API</Button>
              </Link>
            </div>
          ) : (
            apis.map((item) => (
              <Link
                key={item.id}
                href={`/${workspace}/apis/${item.id}`}
                className="flex items-center justify-between border-b border-border px-6 py-3 last:border-0 hover:bg-accent/30 transition-colors"
              >
                {/* Aligned to the first line rather than the block, so the
                    badge sits level with the name and not between the two
                    lines of text. */}
                <div className="flex min-w-0 items-start gap-3">
                  <MethodBadge method={item.method} className="mt-px shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-5">
                      {item.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {item.endpoint}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.is_deployed ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Live" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Draft</span>
                  )}
                </div>
              </Link>
            ))
          )}
          {apis.length > 0 && (
            <Link
              href={`/${workspace}/apis`}
              className="flex items-center justify-center gap-1 border-t border-border py-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent requests
            </span>
            <Link href={`/${workspace}/logs`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                All logs
              </Button>
            </Link>
          </div>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Activity className="mb-2 h-5 w-5 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No requests yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Deploy an endpoint to start receiving traffic
              </p>
            </div>
          ) : (
            activity.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between border-b border-border px-6 py-2.5 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <MethodBadge method={log.method} />
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {log.path}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={
                      log.status_code < 300
                        ? "text-emerald-400"
                        : log.status_code < 500
                          ? "text-amber-400"
                          : "text-red-400"
                    }
                  >
                    {log.status_code}
                  </span>
                  <span>{log.latency_ms}ms</span>
                  <span className="hidden sm:inline">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
