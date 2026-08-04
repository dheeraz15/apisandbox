"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { RotateCcw, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/page-header";
import { MethodBadge } from "@/components/apis/method-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, RequestLog, prettyJSON } from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface LogsPageProps {
  workspace: string;
}

export function LogsPage({ workspace }: LogsPageProps) {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RequestLog | null>(null);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    api.logs
      .list(workspace, search ? { search } : undefined)
      .then((res) => setLogs(res.results))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [workspace]);

  const handleReplay = async (id: string) => {
    try {
      const result = await api.logs.replay(id);
      toast.success(`Replay → ${result.status} (${result.latency_ms}ms)`);
    } catch {
      toast.error("Replay failed");
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Logs"
        description="Every request — path, status, latency, rules matched"
        action={
          <div className="flex gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-sm"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            <Button variant="outline" size="sm" className="h-8" onClick={load}>
              Search
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="sticky top-0 grid grid-cols-[110px_56px_1fr_90px_80px_64px_72px_36px] gap-2 border-b border-border bg-background px-6 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Time</span>
            <span>Method</span>
            <span>Path / API</span>
            <span>Collection</span>
            <span>Finding</span>
            <span>Status</span>
            <span>Latency</span>
            <span />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                No requests yet. Deploy an endpoint to start receiving traffic.
              </p>
            ) : (
              logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelected(log)}
                  className={`grid w-full grid-cols-[110px_56px_1fr_90px_80px_64px_72px_36px] items-center gap-2 border-b border-border px-6 py-2.5 text-left text-sm transition-colors hover:bg-accent/30 ${
                    selected?.id === log.id ? "bg-accent/40" : ""
                  }`}
                >
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "MMM d HH:mm:ss")}
                  </span>
                  <MethodBadge method={log.method} />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{log.path}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {log.api_name || "—"}
                    </p>
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {log.collection_name || "—"}
                  </span>
                  <span className="truncate font-mono text-[11px] text-amber-400/90">
                    {log.finding || "—"}
                  </span>
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
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {log.latency_ms}ms
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplay(log.id);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {selected && (
          <div className="flex w-[400px] shrink-0 flex-col border-l border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-medium">Request detail</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelected(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex flex-wrap gap-2">
                <MethodBadge method={selected.method} />
                <Badge variant="secondary">{selected.status_code}</Badge>
                    {selected.api_name && <Badge variant="outline">{selected.api_name}</Badge>}
                {selected.api_version && (
                  <Badge variant="outline">{selected.api_version}</Badge>
                )}
                {selected.collection_name && (
                  <Badge variant="outline">{selected.collection_name}</Badge>
                )}
                {selected.finding && (
                  <Badge className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/15">
                    {selected.finding}
                  </Badge>
                )}
              </div>
              <MetaRow label="Path" value={selected.path} mono />
              <MetaRow label="Version" value={selected.api_version || "v1"} />
              <MetaRow label="Request ID" value={selected.request_id || "—"} mono />
              <MetaRow label="Trace ID" value={selected.trace_id || "—"} mono />
              <MetaRow label="Span ID" value={selected.span_id || "—"} mono />
              <MetaRow label="Host" value={selected.domain_host || "—"} mono />
              <MetaRow label="Scenario" value={selected.scenario_used || "—"} />
              <MetaRow label="IP" value={selected.client_ip || "—"} />
              <MetaRow label="Latency" value={`${selected.latency_ms}ms`} />

              <EditorBlock label="Request body" value={prettyJSON(selected.request_body)} height={140} />
              <EditorBlock label="Response body" value={prettyJSON(selected.response_body)} height={160} />
              <EditorBlock label="Headers" value={prettyJSON(selected.request_headers)} height={100} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditorBlock({
  label,
  value,
  height,
}: {
  label: string;
  value: string;
  height: number;
}) {
  return (
    <section>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <MonacoEditor
        height={`${height}px`}
        language="json"
        theme="vs-dark"
        value={value}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 11,
          wordWrap: "on",
          scrollBeyondLastLine: false,
        }}
      />
    </section>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
