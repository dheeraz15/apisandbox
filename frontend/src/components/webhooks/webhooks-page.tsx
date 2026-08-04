"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Copy,
  Plus,
  Trash2,
  Webhook,
  Download,
  Radio,
  ArrowDownAZ,
  ArrowUpAZ,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  api,
  IncomingWebhook,
  OutgoingWebhook,
  WebhookDelivery,
  prettyJSON,
} from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const POLL_MS = 2000;

export function WebhooksPage({ workspace }: { workspace: string }) {
  const [workspaceId, setWorkspaceId] = useState("");
  const [incoming, setIncoming] = useState<IncomingWebhook[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingWebhook[]>([]);
  const [selected, setSelected] = useState<IncomingWebhook | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [delivery, setDelivery] = useState<WebhookDelivery | null>(null);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [live, setLive] = useState(true);
  const lastPollRef = useRef<string | null>(null);

  const [inName, setInName] = useState("");
  const [inSlug, setInSlug] = useState("");
  const [inDomain, setInDomain] = useState("platform");
  const [domains, setDomains] = useState<{ id: string; domain: string; verified: boolean }[]>([]);
  const [outName, setOutName] = useState("");
  const [outUrl, setOutUrl] = useState("");

  const load = async () => {
    const [ws, inc, out, doms] = await Promise.all([
      api.workspaces.get(workspace),
      api.webhooks.incoming.list(workspace),
      api.webhooks.outgoing.list(workspace),
      api.workspaces.domains.list(workspace).catch(() => []),
    ]);
    setWorkspaceId(ws.id);
    setIncoming(inc);
    setOutgoing(out);
    setDomains(doms.filter((d) => d.verified));
  };

  useEffect(() => {
    load().catch(console.error);
  }, [workspace]);

  const fetchDeliveries = useCallback(
    async (hookId: string, merge = false) => {
      const since = merge && lastPollRef.current ? lastPollRef.current : undefined;
      const list = await api.webhooks.incoming.deliveries(hookId, {
        sort,
        since: merge ? since : undefined,
        limit: 200,
      });

      if (merge && list.length > 0) {
        setDeliveries((prev) => {
          const ids = new Set(prev.map((d) => d.id));
          const newOnes = list.filter((d) => !ids.has(d.id));
          if (newOnes.length === 0) return prev;
          const combined =
            sort === "newest"
              ? [...newOnes, ...prev]
              : [...prev, ...newOnes];
          return combined.slice(0, 200);
        });
        if (list[0]) {
          lastPollRef.current = list[0].created_at;
        }
      } else {
        setDeliveries(list);
        if (list[0]) {
          lastPollRef.current = list[0].created_at;
        } else {
          lastPollRef.current = null;
        }
      }
    },
    [sort]
  );

  const selectIncoming = async (hook: IncomingWebhook) => {
    setSelected(hook);
    setDelivery(null);
    lastPollRef.current = null;
    await fetchDeliveries(hook.id, false);
  };

  useEffect(() => {
    if (!selected || !live) return;
    const id = setInterval(() => {
      fetchDeliveries(selected.id, true).catch(() => {});
      // refresh hook hit count
      api.webhooks.incoming.list(workspace).then(setIncoming).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, [selected, live, workspace, fetchDeliveries]);

  useEffect(() => {
    if (selected) {
      fetchDeliveries(selected.id, false).catch(console.error);
    }
  }, [sort, selected, fetchDeliveries]);

  const payloadText = delivery
    ? prettyJSON({
        method: delivery.method,
        headers: delivery.headers,
        query: delivery.query_params,
        body: delivery.body,
        raw: delivery.raw_body,
      })
    : "";

  const copyPayload = () => {
    if (!payloadText) return;
    navigator.clipboard.writeText(payloadText);
    toast.success("Payload copied");
  };

  const createIncoming = async () => {
    if (!inName || !inSlug) return;
    try {
      const hook = await api.webhooks.incoming.create({
        workspace: workspaceId,
        name: inName,
        slug: inSlug,
        custom_domain: inDomain === "platform" ? null : inDomain,
      });
      toast.success("Webhook ready to receive");
      setInName("");
      setInSlug("");
      setInDomain("platform");
      await load();
      selectIncoming(hook);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const createOutgoing = async () => {
    if (!outName || !outUrl) return;
    try {
      await api.webhooks.outgoing.create({
        workspace: workspaceId,
        name: outName,
        url: outUrl,
        method: "POST",
        enabled: true,
      });
      toast.success("Outgoing webhook created");
      setOutName("");
      setOutUrl("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Webhooks"
        description="Receive payloads in real time · export inbox · fire outgoing hooks"
        action={
          selected && (
            <div className="flex items-center gap-2">
              <Button
                variant={live ? "default" : "outline"}
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setLive((v) => !v)}
              >
                <Radio className={`h-3.5 w-3.5 ${live ? "animate-pulse" : ""}`} />
                {live ? "Live" : "Paused"}
              </Button>
            </div>
          )
        }
      />

      <div className="flex flex-1 overflow-hidden p-4">
        <Tabs defaultValue="incoming" className="flex h-full w-full flex-col">
          <TabsList>
            <TabsTrigger value="incoming">Incoming inbox</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-3 flex flex-1 overflow-hidden gap-3">
            <div className="w-64 shrink-0 space-y-2 overflow-y-auto">
              <div className="rounded-lg border border-border p-3 space-y-2">
                <Label className="text-xs">New receiver</Label>
                <Input
                  value={inName}
                  onChange={(e) => setInName(e.target.value)}
                  placeholder="Stripe events"
                  className="h-8 text-sm"
                />
                <Input
                  className="h-8 font-mono text-sm"
                  value={inSlug}
                  onChange={(e) =>
                    setInSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                  }
                  placeholder="stripe"
                />
                <Select value={inDomain} onValueChange={(v) => v && setInDomain(v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === "platform") return "Platform domain";
                        return domains.find((d) => d.id === value)?.domain || "Domain";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform" label="Platform domain">
                      Platform domain
                    </SelectItem>
                    {domains.map((d) => (
                      <SelectItem key={d.id} value={d.id} label={d.domain}>
                        {d.domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full h-8" size="sm" onClick={createIncoming}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create receiver
                </Button>
              </div>
              {incoming.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => selectIncoming(h)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent/40 ${
                    selected?.id === h.id ? "border-foreground/30 bg-accent/50" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Webhook className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium truncate">{h.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {h.hit_count} hits
                  </p>
                </button>
              ))}
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border">
              {selected ? (
                <>
                  <div className="border-b border-border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{selected.name}</p>
                      {live && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Listening
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
                        {selected.receive_url}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          navigator.clipboard.writeText(selected.receive_url);
                          toast.success("URL copied");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() =>
                          api.webhooks.incoming.exportDeliveries(selected.id, "csv")
                        }
                      >
                        <Download className="mr-1 h-3.5 w-3.5" /> CSV
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          api.webhooks.incoming.delete(selected.id).then(() => {
                            setSelected(null);
                            load();
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      POST any payload. Optional{" "}
                      <code className="font-mono">X-Webhook-Secret: {selected.secret}</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                    <span className="text-xs text-muted-foreground">Inbox</span>
                    <Select value={sort} onValueChange={(v) => v && setSort(v as "newest" | "oldest")}>
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">
                          <span className="flex items-center gap-1">
                            <ArrowDownAZ className="h-3 w-3" /> Newest
                          </span>
                        </SelectItem>
                        <SelectItem value="oldest">
                          <span className="flex items-center gap-1">
                            <ArrowUpAZ className="h-3 w-3" /> Oldest
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {deliveries.length} events
                    </span>
                  </div>

                  <div className="flex flex-1 overflow-hidden min-h-0">
                    <div className="w-52 shrink-0 overflow-y-auto border-r border-border">
                      {deliveries.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-xs text-muted-foreground">
                            Waiting for payloads…
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Auto-updates every {POLL_MS / 1000}s
                          </p>
                        </div>
                      ) : (
                        deliveries.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setDelivery(d)}
                            className={`block w-full border-b border-border px-3 py-2.5 text-left hover:bg-accent/30 ${
                              delivery?.id === d.id ? "bg-accent/50" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-xs font-medium">{d.method}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(d.created_at), "HH:mm:ss")}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                              {format(new Date(d.created_at), "MMM d, yyyy")}
                            </p>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
                      {delivery ? (
                        <>
                          <div className="flex items-center justify-between border-b border-border px-3 py-2">
                            <div className="flex flex-wrap gap-2 text-xs">
                              <Badge variant="secondary">{delivery.method}</Badge>
                              <span className="text-muted-foreground">{delivery.client_ip}</span>
                              <span className="text-muted-foreground">
                                {format(new Date(delivery.created_at), "PPpp")}
                              </span>
                            </div>
                            <Button variant="outline" size="sm" className="h-7" onClick={copyPayload}>
                              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy payload
                            </Button>
                          </div>
                          <div className="flex-1 min-h-0 p-2">
                            <MonacoEditor
                              height="100%"
                              language="json"
                              theme="vs-dark"
                              value={payloadText}
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 12,
                                wordWrap: "on",
                                scrollBeyondLastLine: false,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                          Select an event to inspect payload
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Create or select an incoming webhook receiver
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="outgoing" className="mt-3 space-y-4 overflow-y-auto">
            <div className="grid max-w-xl gap-2 rounded-lg border border-border p-4">
              <Label>Name</Label>
              <Input value={outName} onChange={(e) => setOutName(e.target.value)} />
              <Label>Target URL</Label>
              <Input
                className="font-mono"
                value={outUrl}
                onChange={(e) => setOutUrl(e.target.value)}
                placeholder="https://hooks.example.com/sandbox"
              />
              <Button onClick={createOutgoing} className="mt-2 w-fit">
                <Plus className="mr-1.5 h-4 w-4" /> Add outgoing webhook
              </Button>
            </div>
            <div className="rounded-lg border border-border">
              {outgoing.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{h.url}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => api.webhooks.outgoing.delete(h.id).then(load)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {outgoing.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No outgoing webhooks</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
