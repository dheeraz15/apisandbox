"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Rocket, Play, Copy, Loader2, Download } from "lucide-react";
import { MethodBadge } from "@/components/apis/method-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  api,
  MockAPI,
  TestResponse,
  RequestLog,
  ApiStats,
  WorkspaceDomain,
  getPlatformMockBase,
  prettyJSON,
} from "@/lib/api";
import { downloadJson } from "@/lib/download";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function APIEditorPage({
  workspace,
  apiId,
}: {
  workspace: string;
  apiId: string;
}) {
  const [apiData, setApiData] = useState<MockAPI | null>(null);
  const [domains, setDomains] = useState<WorkspaceDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [testBody, setTestBody] = useState("{}");
  const [testResult, setTestResult] = useState<TestResponse | null>(null);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [rateLimit, setRateLimit] = useState<number | "">("");

  const load = () => {
    api.apis
      .get(apiId)
      .then((data) => {
        setApiData(data);
        setTestBody(JSON.stringify(data.body_example || {}, null, 2));
        setRateLimit(data.rate_limit ?? "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.apis.logs(apiId).then(setLogs).catch(() => {});
    api.apis.stats(apiId).then(setStats).catch(() => {});
    api.workspaces.domains.list(workspace).then(setDomains).catch(() => {});
  }, [apiId, workspace]);

  const saveRateLimit = async () => {
    const val = rateLimit === "" ? null : Number(rateLimit);
    const updated = await api.apis.update(apiId, { rate_limit: val });
    setApiData(updated);
    toast.success("Rate limit saved");
  };

  const handleDeploy = async () => {
    const updated = await api.apis.deploy(apiId);
    setApiData(updated);
    toast.success("Deployed");
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const body = JSON.parse(testBody);
      setTestResult(await api.apis.test(apiId, { body }));
    } catch {
      toast.error("Test failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading || !apiData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <MethodBadge method={apiData.method} />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{apiData.name}</h1>
            <p className="font-mono text-xs text-muted-foreground">{apiData.endpoint}</p>
          </div>
          {apiData.is_deployed ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10">
              Live
            </Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {!apiData.is_deployed && (
            <Button size="sm" onClick={handleDeploy}>
              <Rocket className="mr-1.5 h-3.5 w-3.5" /> Deploy
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" variant="outline">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const data = await api.apis.export(apiId, "openapi");
                    downloadJson(
                      `${apiData.name.replace(/\s+/g, "-").toLowerCase()}.openapi.json`,
                      data
                    );
                    toast.success("Exported OpenAPI");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Export failed");
                  }
                }}
              >
                OpenAPI / Swagger
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const data = await api.apis.export(apiId, "postman");
                    downloadJson(
                      `${apiData.name.replace(/\s+/g, "-").toLowerCase()}.postman.json`,
                      data
                    );
                    toast.success("Exported Postman");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Export failed");
                  }
                }}
              >
                Postman collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 space-y-4 overflow-y-auto border-r border-border p-4 text-sm">
          {apiData.is_deployed && (
            <div>
              <Label className="text-xs text-muted-foreground">Live URL</Label>
              <div className="mt-1 flex gap-1">
                <Input
                  readOnly
                  value={apiData.deployed_url}
                  className="h-7 text-[10px] font-mono"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                  navigator.clipboard.writeText(apiData.deployed_url);
                  toast.success("Copied");
                }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Revision</Label>
            <div className="mt-1 flex h-8 items-center rounded-md border border-border bg-muted/20 px-2 font-mono text-xs text-muted-foreground">
              {apiData.version_label || `v${apiData.version}`}
              <span className="ml-2 text-[10px] normal-case tracking-normal">
                auto on save
              </span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Endpoint type</Label>
            <Select
              value={(apiData.endpoint_type as string) || "action"}
              onValueChange={async (v) => {
                if (!v || v === apiData.endpoint_type) return;
                setApiData(await api.apis.update(apiId, { endpoint_type: v }));
                toast.success("Endpoint type updated");
              }}
            >
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["list", "detail", "create", "update", "delete", "action"].map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Endpoint path</Label>
            <Input
              className="mt-1 h-8 font-mono text-xs"
              value={apiData.endpoint}
              onBlur={async (e) => {
                const endpoint = e.target.value.trim() || "/";
                if (endpoint === apiData.endpoint) return;
                setApiData(await api.apis.update(apiId, { endpoint }));
                toast.success("Endpoint updated");
              }}
              onChange={(e) => setApiData({ ...apiData, endpoint: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Domain</Label>
            <Select
              value={apiData.custom_domain || "platform"}
              onValueChange={async (v) => {
                if (!v) return;
                setApiData(
                  await api.apis.update(apiId, {
                    custom_domain: v === "platform" ? null : v,
                  })
                );
                toast.success("Domain updated");
              }}
            >
              <SelectTrigger className="mt-1 h-8 w-full max-w-[220px]">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value || value === "platform") {
                      return `Platform · ${getPlatformMockBase(workspace)}`;
                    }
                    const match = domains.find((d) => d.id === value);
                    return (
                      match?.domain ||
                      apiData.custom_domain_name ||
                      "Custom domain"
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform" label={`Platform · ${getPlatformMockBase(workspace)}`}>
                  Platform · {getPlatformMockBase(workspace)}
                </SelectItem>
                {domains.filter((d) => d.verified).map((d) => (
                  <SelectItem key={d.id} value={d.id} label={d.domain}>
                    {d.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Scenario</Label>
            <Select
              value={apiData.active_scenario}
              onValueChange={async (v) => {
                if (!v) return;
                setApiData(await api.apis.update(apiId, { active_scenario: v }));
              }}
            >
              <SelectTrigger className="mt-1 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(apiData.scenarios?.length
                  ? apiData.scenarios
                  : [{ name: "default", label: "Default" }]
                ).map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.label || s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Auth</Label>
            <Select
              value={apiData.auth_type}
              onValueChange={async (v) => {
                if (!v) return;
                setApiData(await api.apis.update(apiId, { auth_type: v }));
              }}
            >
              <SelectTrigger className="mt-1 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["none", "api_key", "bearer", "basic"].map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rate limit (req/min)</Label>
            <div className="mt-1 flex gap-1">
              <Input
                type="number"
                className="h-8"
                placeholder="Unlimited"
                value={rateLimit}
                onChange={(e) =>
                  setRateLimit(e.target.value ? parseInt(e.target.value) : "")
                }
              />
              <Button variant="outline" size="sm" className="h-8" onClick={saveRateLimit}>
                Save
              </Button>
            </div>
          </div>
          {stats && (
            <div className="rounded-md border border-border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">7-day stats</p>
              <p className="tabular-nums">{stats.total_requests} requests</p>
              <p className="text-xs text-muted-foreground">
                {stats.avg_latency_ms}ms avg · {stats.error_rate}% errors
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="test">
            <TabsList className="mx-6 mt-4 h-8">
              <TabsTrigger value="test" className="text-xs">Test</TabsTrigger>
              <TabsTrigger value="response" className="text-xs">Response</TabsTrigger>
              <TabsTrigger value="rules" className="text-xs">Rules</TabsTrigger>
              <TabsTrigger value="logs" className="text-xs">
                Logs {logs.length > 0 && `(${logs.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="p-6 pt-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex justify-between">
                    <Label className="text-xs">Request</Label>
                    <Button size="sm" className="h-7" onClick={handleTest} disabled={testing}>
                      {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                      Send
                    </Button>
                  </div>
                  <MonacoEditor height="280px" language="json" theme="vs-dark" value={testBody}
                    onChange={(v) => setTestBody(v || "{}")}
                    options={{ minimap: { enabled: false }, fontSize: 12 }} />
                </div>
                <div>
                  <Label className="text-xs">Response</Label>
                  {testResult ? (
                    <div className="mt-2">
                      <div className="mb-2 flex gap-3 text-xs">
                        <span className={testResult.status < 300 ? "text-emerald-400" : "text-amber-400"}>
                          {testResult.status}
                        </span>
                        <span className="text-muted-foreground">{testResult.latency_ms}ms</span>
                        {testResult.finding && (
                          <span className="font-mono text-amber-500/80">{testResult.finding}</span>
                        )}
                      </div>
                      <MonacoEditor height="240px" language="json" theme="vs-dark"
                        value={prettyJSON(testResult.body)}
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }} />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">Send a request to preview</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="response" className="p-6 pt-4">
              <MonacoEditor height="400px" language="json" theme="vs-dark"
                value={prettyJSON(apiData.responses?.[0]?.body || {})}
                options={{ readOnly: true, minimap: { enabled: false } }} />
            </TabsContent>

            <TabsContent value="rules" className="p-6 pt-4 space-y-2">
              {apiData.rules?.length ? apiData.rules.map((rule, i) => (
                <div key={i} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{rule.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    IF {rule.condition.field} {rule.condition.operator} &quot;{rule.condition.value}&quot;
                    → {rule.response.status_code}
                  </p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No rules configured</p>
              )}
            </TabsContent>

            <TabsContent value="logs" className="p-0">
              <div className="divide-y divide-border">
                {logs.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">No requests yet</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between px-6 py-2.5 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <MethodBadge method={log.method} />
                        <span className="truncate font-mono text-xs text-muted-foreground">{log.path}</span>
                        {log.finding && (
                          <span className="hidden sm:inline font-mono text-[10px] text-amber-500/80">{log.finding}</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        <span className={log.status_code < 300 ? "text-emerald-400" : "text-amber-400"}>
                          {log.status_code}
                        </span>
                        <span>{log.latency_ms}ms</span>
                        <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
