"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Play, ArrowRight } from "lucide-react";
import { api, setAuthToken, getEndpointUrl, MockAPI } from "@/lib/api";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MethodBadge } from "@/components/apis/method-badge";
import { prettyJSON } from "@/lib/api";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Step = "workspace" | "hit" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("workspace");
  const [orgName, setOrgName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [slug, setSlug] = useState("");
  const [apiItem, setApiItem] = useState<MockAPI | null>(null);
  const [hitResult, setHitResult] = useState<{
    status_code: number;
    body: unknown;
    latency_ms?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hitting, setHitting] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(async () => {
        const workspaces = await api.workspaces.list();
        if (workspaces.length > 0) router.replace(`/${workspaces[0].slug}`);
      })
      .catch(() => {
        setAuthToken(null);
        router.replace("/signup");
      })
      .finally(() => setChecking(false));
  }, [router]);

  const onNameChange = (value: string) => {
    setWorkspaceName(value);
    setWorkspaceSlug(slugify(value));
  };

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const s = workspaceSlug || slugify(workspaceName) || "workspace";
      const workspace = await api.workspaces.create({
        name: workspaceName || "My Workspace",
        slug: s,
        description: orgName ? `Organization: ${orgName}` : "",
      });
      setSlug(workspace.slug);

      // Bootstrap a live echo endpoint from template
      const tpl = await api.apis.fromTemplate("echo", workspace.id);
      const created = await api.apis.create({
        ...tpl,
        workspace: workspace.id,
        name: "Hello endpoint",
        endpoint: "/hello",
        method: "POST",
        endpoint_type: "action",
      } as Partial<MockAPI> & { workspace: string });
      const deployed = await api.apis.deploy(created.id);
      setApiItem(deployed);
      setStep("hit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  const hitEndpoint = async () => {
    if (!apiItem) return;
    setHitting(true);
    setError("");
    try {
      const res = await api.apis.test(apiItem.id, {
        method: "POST",
        body: { message: "hello from onboarding", at: new Date().toISOString() },
      });
      setHitResult({
        status_code: res.status,
        body: res.body,
        latency_ms: res.latency_ms,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setHitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <AuthLayout
      title={
        step === "workspace"
          ? "Create your workspace"
          : step === "hit"
            ? "Hit your first endpoint"
            : "You are ready"
      }
      subtitle={
        step === "workspace"
          ? "This is where your mock APIs live."
          : step === "hit"
            ? "We deployed a hello endpoint. Send a request and see the response."
            : "Continue to your overview to keep building."
      }
    >
      <div className="mb-6 flex gap-2">
        {(["workspace", "hit", "done"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              ["workspace", "hit", "done"].indexOf(step) >= i
                ? "bg-foreground"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {step === "workspace" && (
        <form onSubmit={createWorkspace} className="space-y-4">
          <div className="space-y-2">
            <Label>Company / team name</Label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Inc"
              className="h-10 bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label>Workspace name</Label>
            <Input
              value={workspaceName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Production mocks"
              className="h-10 bg-background"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>URL slug</Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 h-10">
              <span className="text-sm text-muted-foreground shrink-0">/</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none"
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(slugify(e.target.value))}
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="h-10 w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      )}

      {step === "hit" && apiItem && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <MethodBadge method={apiItem.method} />
              <span className="font-mono text-xs">{apiItem.endpoint}</span>
            </div>
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              {getEndpointUrl(slug, apiItem.endpoint)}
            </p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button className="h-10 w-full" onClick={hitEndpoint} disabled={hitting}>
            {hitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Send test request
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => router.push(`/${slug}`)}
          >
            Skip for now
          </Button>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Check className="h-4 w-4" />
            Request succeeded
            {hitResult?.latency_ms != null && (
              <span className="text-muted-foreground">· {hitResult.latency_ms}ms</span>
            )}
          </div>
          <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-[#0a0a0a] p-3 font-mono text-[11px] text-muted-foreground">
            {prettyJSON({
              status: hitResult?.status_code,
              body: hitResult?.body,
            })}
          </pre>
          <Button className="h-10 w-full" onClick={() => router.push(`/${slug}`)}>
            Go to overview
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
