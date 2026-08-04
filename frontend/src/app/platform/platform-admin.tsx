"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Search, Shield } from "lucide-react";
import {
  api,
  AuthUser,
  PlatformAnalytics,
  PlatformLogRow,
  PlatformOverview,
  PlatformUserRow,
  PlatformWorkspaceRow,
  getAuthToken,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MethodBadge } from "@/components/apis/method-badge";
import { BrandLogo } from "@/components/brand-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  lastWorkspace,
  setViewMode,
} from "@/lib/view-mode";

type Tab = "overview" | "users" | "workspaces" | "logs" | "analytics";

export function PlatformAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [users, setUsers] = useState<PlatformUserRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [workspaces, setWorkspaces] = useState<PlatformWorkspaceRow[]>([]);
  const [workspacesTotal, setWorkspacesTotal] = useState(0);
  const [logs, setLogs] = useState<PlatformLogRow[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [q, setQ] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [apiFilter, setApiFilter] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [fromLocal, setFromLocal] = useState("");
  const [toLocal, setToLocal] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }
    setViewMode("platform");
    api.auth
      .me()
      .then((me) => {
        if (!me.is_staff && !me.is_superuser) {
          setError("Platform access requires a staff account.");
          setUser(me);
          return;
        }
        setUser(me);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const goUserView = async () => {
    setViewMode("user");
    const remembered = lastWorkspace();
    if (remembered) {
      router.push(`/${remembered}`);
      return;
    }
    try {
      const list = await api.workspaces.list();
      if (list[0]?.slug) router.push(`/${list[0].slug}`);
      else router.push("/onboarding");
    } catch {
      router.push("/onboarding");
    }
  };

  const load = useCallback(async () => {
    if (!user?.is_staff && !user?.is_superuser) return;
    const from = fromLocal ? new Date(fromLocal).toISOString() : undefined;
    const to = toLocal ? new Date(toLocal).toISOString() : undefined;
    try {
      setError("");
      if (tab === "overview") {
        setOverview(await api.platform.overview());
      } else if (tab === "users") {
        const res = await api.platform.users({ q, from, to, limit: 100 });
        setUsers(res.results);
        setUsersTotal(res.total);
      } else if (tab === "workspaces") {
        const res = await api.platform.workspaces({
          q,
          user: userFilter || undefined,
          from,
          to,
          limit: 100,
        });
        setWorkspaces(res.results);
        setWorkspacesTotal(res.total);
      } else if (tab === "logs") {
        const res = await api.platform.logs({
          q,
          method: method || undefined,
          status: status || undefined,
          user: userFilter || undefined,
          api: apiFilter || undefined,
          workspace: workspaceFilter || undefined,
          from,
          to,
          limit: 100,
        });
        setLogs(res.results);
        setLogsTotal(res.total);
      } else if (tab === "analytics") {
        setAnalytics(
          await api.platform.analytics({
            from,
            to,
            days: from ? undefined : 7,
            user: userFilter || undefined,
            api: apiFilter || undefined,
            workspace: workspaceFilter || undefined,
            q: q || undefined,
          })
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [
    user,
    tab,
    q,
    method,
    status,
    fromLocal,
    toLocal,
    userFilter,
    apiFilter,
    workspaceFilter,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking access…
      </div>
    );
  }

  if (error && !user?.is_staff && !user?.is_superuser) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <Shield className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Platform access denied</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link href="/">
          <Button variant="outline">Back home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <BrandLogo size={28} showWordmark />
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent">
                <Shield className="h-3 w-3" />
                Platform view
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={goUserView}>User view</DropdownMenuItem>
                <DropdownMenuItem disabled>Platform view</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Badge variant="secondary" className="hidden font-mono text-[10px] sm:inline-flex">
              {user?.email}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goUserView}>
              Open workspace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await api.auth.logout().catch(() => null);
                router.push("/login");
              }}
            >
              Log out
            </Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {(
            [
              ["overview", "Overview"],
              ["users", "Users"],
              ["workspaces", "Workspaces"],
              ["logs", "API requests"],
              ["analytics", "Analytics"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                tab === id
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {tab !== "overview" && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
            <div className="min-w-[160px] flex-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-9 pl-8"
                  placeholder={
                    tab === "users"
                      ? "Email, name…"
                      : tab === "workspaces"
                        ? "Workspace name or slug…"
                        : "Path, request id…"
                  }
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            {(tab === "logs" || tab === "analytics" || tab === "workspaces") && (
              <div>
                <Label className="text-xs text-muted-foreground">User</Label>
                <Input
                  className="mt-1 h-9 w-40"
                  placeholder="email or id"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                />
              </div>
            )}
            {(tab === "logs" || tab === "analytics") && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">API</Label>
                  <Input
                    className="mt-1 h-9 w-36"
                    placeholder="name or id"
                    value={apiFilter}
                    onChange={(e) => setApiFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Workspace</Label>
                  <Input
                    className="mt-1 h-9 w-32"
                    placeholder="slug"
                    value={workspaceFilter}
                    onChange={(e) => setWorkspaceFilter(e.target.value)}
                  />
                </div>
              </>
            )}
            {tab === "logs" && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Method</Label>
                  <Input
                    className="mt-1 h-9 w-24"
                    placeholder="GET"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Input
                    className="mt-1 h-9 w-20"
                    placeholder="200"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="datetime-local"
                className="mt-1 h-9"
                value={fromLocal}
                onChange={(e) => setFromLocal(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="datetime-local"
                className="mt-1 h-9"
                value={toLocal}
                onChange={(e) => setToLocal(e.target.value)}
              />
            </div>
            <Button size="sm" className="h-9" onClick={load}>
              Apply
            </Button>
          </div>
        )}

        {error && (user?.is_staff || user?.is_superuser) && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {tab === "overview" && overview && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Users", overview.users_total],
              ["Active 7d", overview.users_active_7d],
              ["Workspaces", overview.workspaces_total],
              ["APIs", overview.apis_total],
              ["Deployed APIs", overview.apis_deployed],
              ["Verified domains", overview.domains_verified],
              ["Requests 24h", overview.requests_24h],
              ["Errors 24h", overview.errors_24h],
              ["Requests 7d", overview.requests_7d],
              ["Requests total", overview.requests_total],
              ["Avg latency 24h", `${overview.avg_latency_24h}ms`],
              ["Staff", overview.users_staff],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
              {usersTotal.toLocaleString()} users
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Joined</th>
                    <th className="px-4 py-2 font-medium">Last login</th>
                    <th className="px-4 py-2 font-medium">Workspaces</th>
                    <th className="px-4 py-2 font-medium">Requests</th>
                    <th className="px-4 py-2 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.name || u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(u.date_joined).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {u.workspace_count}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {u.workspaces.slice(0, 3).map((w) => (
                            <Badge key={w.slug} variant="outline" className="font-mono text-[10px]">
                              {w.slug}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs">{u.request_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.google_linked && <Badge variant="secondary">Google</Badge>}
                          {u.is_staff && <Badge>Staff</Badge>}
                          {!u.is_active && <Badge variant="outline">Inactive</Badge>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "workspaces" && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
              {workspacesTotal.toLocaleString()} workspaces
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Workspace</th>
                    <th className="px-4 py-2 font-medium">Owner</th>
                    <th className="px-4 py-2 font-medium">Members</th>
                    <th className="px-4 py-2 font-medium">APIs</th>
                    <th className="px-4 py-2 font-medium">Deployed</th>
                    <th className="px-4 py-2 font-medium">Requests</th>
                    <th className="px-4 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((w) => (
                    <tr key={w.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{w.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{w.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {w.owner_email || "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs">{w.member_count}</td>
                      <td className="px-4 py-3 tabular-nums text-xs">{w.api_count}</td>
                      <td className="px-4 py-3 tabular-nums text-xs">{w.deployed_count}</td>
                      <td className="px-4 py-3 tabular-nums text-xs">{w.request_count}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(w.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
              {logsTotal.toLocaleString()} requests
            </div>
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <MethodBadge method={log.method} />
                      <span className="font-mono text-xs">{log.path}</span>
                      <span
                        className={
                          log.status_code < 400
                            ? "text-emerald-400 text-xs"
                            : "text-red-400 text-xs"
                        }
                      >
                        {log.status_code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {log.latency_ms}ms
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {log.workspace_name || log.workspace || "—"}
                      {log.api_name ? ` · ${log.api_name}` : ""}
                      {log.api_version ? ` · ${log.api_version}` : ""}
                      {log.domain_host ? ` · ${log.domain_host}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="px-4 py-10 text-sm text-muted-foreground">No logs match</p>
              )}
            </div>
          </div>
        )}

        {tab === "analytics" && analytics && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Total requests", analytics.total_requests.toLocaleString()],
                ["Error rate", `${analytics.error_rate}%`],
                ["Avg latency", `${analytics.avg_latency_ms}ms`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="By workspace">
                {analytics.by_workspace.map((row) => (
                  <div
                    key={row.workspace_id}
                    className="flex justify-between border-b border-border px-4 py-2 text-sm last:border-0"
                  >
                    <span className="font-mono text-xs">{row.workspace__slug}</span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </div>
                ))}
              </Panel>
              <Panel title="By API">
                {(analytics.by_api || []).map((row) => (
                  <div
                    key={row.api_id}
                    className="flex justify-between gap-3 border-b border-border px-4 py-2 text-sm last:border-0"
                  >
                    <span className="truncate font-mono text-xs">
                      {row.api__method} {row.api__name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {row.count}
                    </span>
                  </div>
                ))}
              </Panel>
              <Panel title="Top paths">
                {analytics.top_paths.map((row) => (
                  <div
                    key={`${row.method}-${row.path}`}
                    className="flex justify-between gap-3 border-b border-border px-4 py-2 text-sm last:border-0"
                  >
                    <span className="truncate font-mono text-xs">
                      {row.method} {row.path}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {row.count}
                    </span>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}
