"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  LayoutTemplate,
  Settings2,
  Rocket,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MethodBadge } from "@/components/apis/method-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  api,
  MockAPI,
  ApiTemplate,
  WorkspaceDomain,
  getEndpointUrl,
  getPlatformMockBase,
  prettyJSON,
} from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded border bg-muted/30 text-sm text-muted-foreground">
      Loading editor...
    </div>
  ),
});

const STEPS = ["Basic", "HTTP", "Auth", "Body", "Responses", "Behavior"];

interface APIBuilderPageProps {
  workspace: string;
}

export function APIBuilderPage({ workspace }: APIBuilderPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collectionId = searchParams.get("collection");
  const [mode, setMode] = useState<"templates" | "ai" | "manual">("templates");
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deployOnCreate, setDeployOnCreate] = useState(true);
  const [step, setStep] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [domains, setDomains] = useState<WorkspaceDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("platform");
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<MockAPI>>({
    name: "",
    description: "",
    category: "",
    version: "v1",
    tags: [],
    method: "POST",
    endpoint: "/",
    auth_type: "none",
    body_type: "json",
    body_example: {},
    responses: [],
    behavior: { delay_ms: 150 },
    rules: [],
    state_mode: "stateless",
    active_scenario: "default",
    scenarios: [],
    cors_enabled: true,
    custom_domain: null,
  });

  useEffect(() => {
    api.workspaces
      .get(workspace)
      .then((ws) => setWorkspaceId(ws.id))
      .catch((e) =>
        setBootstrapError(
          e instanceof Error ? e.message : "Failed to load workspace."
        )
      );
    api.workspaces.domains
      .list(workspace)
      .then((list) => {
        setDomains(list);
        const def = list.find((d) => d.verified && d.is_default);
        if (def) {
          setSelectedDomain(def.id);
          setForm((prev) => ({ ...prev, custom_domain: def.id }));
        }
      })
      .catch(() => {});
    api.apis
      .templates()
      .then(setTemplates)
      .catch((e) =>
        setBootstrapError(
          e instanceof Error ? e.message : "Failed to load templates."
        )
      );
  }, [workspace]);

  const verifiedDomains = domains.filter((d) => d.verified);
  const previewDomain =
    selectedDomain === "platform"
      ? null
      : verifiedDomains.find((d) => d.id === selectedDomain) || null;
  const previewUrl = getEndpointUrl(
    workspace,
    form.endpoint || "/",
    previewDomain
  );

  const update = (patch: Partial<MockAPI>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const applyTemplate = async (key: string) => {
    setGenerating(true);
    try {
      const generated = await api.apis.fromTemplate(key, workspaceId || undefined);
      setForm((prev) => ({ ...prev, ...generated }));
      setMode("manual");
      setStep(0);
      toast.success("Template loaded — tweak & deploy");
    } catch {
      toast.error("Failed to load template");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const generated = await api.apis.generate(aiPrompt, workspaceId || undefined);
      setForm((prev) => ({ ...prev, ...generated }));
      setMode("manual");
      setStep(0);
      toast.success("API generated — review and deploy");
    } catch {
      toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (andDeploy = deployOnCreate) => {
    if (!form.name || !form.endpoint) {
      toast.error("Name and endpoint are required");
      return;
    }
    setSaving(true);
    try {
      let wsId = workspaceId;
      if (!wsId) {
        const ws = await api.workspaces.get(workspace);
        wsId = ws.id;
        setWorkspaceId(ws.id);
      }

      const created = await api.apis.create({
        ...form,
        workspace: wsId,
        collection: collectionId || form.collection,
        custom_domain: selectedDomain === "platform" ? null : selectedDomain,
      });
      if (andDeploy) {
        await api.apis.deploy(created.id);
        toast.success("API created and deployed");
      } else {
        toast.success("API saved as draft");
      }
      router.push(`/${workspace}/apis/${created.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const popular = templates.filter((t) => t.popular);
  const rest = templates.filter((t) => !t.popular);

  return (
    <>
      <PageHeader
        title="New endpoint"
        description={
          collectionId
            ? "Adding to collection — template, smart generator, or manual"
            : "Template, smart generator, or build manually"
        }
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
              Save draft
            </Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Create & Deploy
            </Button>
          </div>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-52 shrink-0 border-r border-border p-3">
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as typeof mode)}
          >
            <TabsList className="grid w-full grid-cols-1 h-auto gap-1 bg-transparent p-0">
              <TabsTrigger value="templates" className="justify-start gap-2 data-[state=active]:bg-accent">
                <LayoutTemplate className="h-3.5 w-3.5" /> Templates
              </TabsTrigger>
              <TabsTrigger value="ai" className="justify-start gap-2 data-[state=active]:bg-accent">
                <Sparkles className="h-3.5 w-3.5" /> AI
              </TabsTrigger>
              <TabsTrigger value="manual" className="justify-start gap-2 data-[state=active]:bg-accent">
                <Settings2 className="h-3.5 w-3.5" /> Configure
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {mode === "manual" && (
            <nav className="mt-4 space-y-0.5">
              {STEPS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => setStep(i)}
                  className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    step === i
                      ? "bg-accent font-medium"
                      : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  {i + 1}. {label}
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {bootstrapError && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {bootstrapError}
            </div>
          )}
          {mode === "templates" && (
            <div className="mx-auto max-w-4xl space-y-6">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Instant templates</h2>
                <p className="text-sm text-muted-foreground">
                  One click loads a production-like mock. Then refine auth, rules, and responses.
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Popular
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {popular.map((t) => (
                    <button
                      key={t.key}
                      disabled={generating}
                      onClick={() => applyTemplate(t.key)}
                      className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-foreground/20 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2">
                        <MethodBadge method={t.method} />
                        <Badge variant="secondary" className="text-[10px]">
                          {t.category}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-medium">{t.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t.blurb}</p>
                      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                        {t.endpoint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {rest.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    More
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {rest.map((t) => (
                      <button
                        key={t.key}
                        disabled={generating}
                        onClick={() => applyTemplate(t.key)}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
                      >
                        <span>
                          <span className="font-medium">{t.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t.blurb}
                          </span>
                        </span>
                        <MethodBadge method={t.method} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "ai" && (
            <div className="mx-auto max-w-2xl">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Describe any API</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Orders, users, webhooks, IoT, payments — anything. Schema, rules, and mock data generated instantly.
                </p>
              </div>
              <Textarea
                placeholder='e.g. "Create an order API that accepts orderId and returns status, items, and estimated delivery date."'
                className="min-h-28"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Create an order tracking API",
                  "User profile lookup by ID",
                  "Webhook event receiver",
                  "Product inventory search",
                  "IoT sensor telemetry endpoint",
                  "Invoice payment status check",
                ].map((ex) => (
                  <Button key={ex} variant="outline" size="sm" onClick={() => setAiPrompt(ex)}>
                    {ex}
                  </Button>
                ))}
              </div>
              <Button className="mt-4" onClick={handleGenerate} disabled={generating || !aiPrompt.trim()}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate
              </Button>
            </div>
          )}

          {mode === "manual" && (
            <div className="mx-auto max-w-2xl space-y-4">
              {step === 0 && (
                <>
                  <div>
                    <Label>API Name</Label>
                    <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => update({ description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={form.category || ""}
                      onChange={(e) => update({ category: e.target.value })}
                      placeholder="Core Banking"
                    />
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <div>
                    <Label>Method</Label>
                    <Select value={form.method} onValueChange={(v) => v && update({ method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Endpoint path</Label>
                    <Input
                      className="font-mono"
                      value={form.endpoint}
                      onChange={(e) => update({ endpoint: e.target.value })}
                      placeholder="/v1/users"
                    />
                  </div>
                  <div>
                    <Label>Serve on domain</Label>
                    <Select
                      value={selectedDomain}
                      onValueChange={(v) => {
                        if (!v) return;
                        setSelectedDomain(v);
                        update({
                          custom_domain: v === "platform" ? null : v,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value || value === "platform") {
                              return `Platform default · ${getPlatformMockBase(workspace)}`;
                            }
                            const match = verifiedDomains.find((d) => d.id === value);
                            return match?.domain || "Custom domain";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="platform"
                          label={`Platform default · ${getPlatformMockBase(workspace)}`}
                        >
                          Platform default · {getPlatformMockBase(workspace)}
                        </SelectItem>
                        {verifiedDomains.map((d) => (
                          <SelectItem key={d.id} value={d.id} label={d.domain}>
                            {d.domain}
                            {d.is_default ? " (workspace default)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1.5 text-[11px] text-muted-foreground break-all">
                      Live URL preview:{" "}
                      <code className="font-mono text-foreground">{previewUrl}</code>
                    </p>
                    {verifiedDomains.length === 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Add & verify a custom domain in Settings to serve on your own hostname.
                      </p>
                    )}
                  </div>
                </>
              )}
              {step === 2 && (
                <div>
                  <Label>Authentication</Label>
                  <Select value={form.auth_type} onValueChange={(v) => v && update({ auth_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["none", "api_key", "bearer", "basic", "oauth2", "custom"].map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {step === 3 && (
                <div>
                  <Label>Request body example</Label>
                  <MonacoEditor
                    height="220px"
                    language="json"
                    theme="vs-dark"
                    value={prettyJSON(form.body_example || {})}
                    onChange={(v) => {
                      try {
                        update({ body_example: JSON.parse(v || "{}") });
                      } catch { /* typing */ }
                    }}
                    options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "var(--font-geist-mono)" }}
                  />
                </div>
              )}
              {step === 4 && (
                <div>
                  <Label>200 Response (supports {"{{variables}}"})</Label>
                  <MonacoEditor
                    height="260px"
                    language="json"
                    theme="vs-dark"
                    value={prettyJSON(form.responses?.[0]?.body || {})}
                    onChange={(v) => {
                      try {
                        const body = JSON.parse(v || "{}");
                        const responses = [...(form.responses || [])];
                        const idx = responses.findIndex((r) => r.status_code === 200);
                        const resp = { status_code: 200, name: "Success", body };
                        if (idx >= 0) responses[idx] = resp;
                        else responses.unshift(resp);
                        update({ responses });
                      } catch { /* typing */ }
                    }}
                    options={{ minimap: { enabled: false }, fontSize: 13 }}
                  />
                </div>
              )}
              {step === 5 && (
                <div className="space-y-3">
                  <div>
                    <Label>Artificial delay (ms)</Label>
                    <Input
                      type="number"
                      value={(form.behavior as { delay_ms?: number })?.delay_ms ?? 0}
                      onChange={(e) =>
                        update({
                          behavior: {
                            ...form.behavior,
                            delay_ms: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={deployOnCreate}
                      onChange={(e) => setDeployOnCreate(e.target.checked)}
                    />
                    Deploy immediately on create
                  </label>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
                {step < STEPS.length - 1 && (
                  <Button onClick={() => setStep((s) => s + 1)}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-80 shrink-0 overflow-y-auto border-l border-border p-4">
          <h3 className="mb-3 text-sm font-medium">Live preview</h3>
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3 text-xs">
            <div className="flex items-center gap-2">
              <MethodBadge method={form.method || "POST"} />
              <span className="font-mono truncate">{form.endpoint || "/"}</span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground break-all">
              {previewUrl}
            </p>
            <p className="font-medium">{form.name || "Untitled API"}</p>
            <p className="text-muted-foreground">{form.description || "No description"}</p>
            <div>
              <p className="mb-1 text-[10px] uppercase text-muted-foreground">Response</p>
              <pre className="max-h-72 overflow-auto rounded bg-background p-2 font-mono text-[11px] leading-relaxed">
                {prettyJSON(form.responses?.[0]?.body || { message: "Configure a response" })}
              </pre>
            </div>
            {(form.rules?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase text-muted-foreground">Rules</p>
                {form.rules?.map((r, i) => (
                  <p key={i} className="font-mono text-[11px] text-amber-500/90">
                    {r.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
