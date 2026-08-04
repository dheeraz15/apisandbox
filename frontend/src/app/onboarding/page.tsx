"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAuthToken } from "@/lib/api";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(async () => {
        const workspaces = await api.workspaces.list();
        if (workspaces.length > 0) router.replace(`/${workspaces[0].slug}`);
      })
      .catch(() => router.replace("/signup"))
      .finally(() => setChecking(false));
  }, [router]);

  const onNameChange = (value: string) => {
    setWorkspaceName(value);
    setWorkspaceSlug(slugify(value));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const slug = workspaceSlug || slugify(workspaceName) || "workspace";
      const workspace = await api.workspaces.create({
        name: workspaceName || "My Workspace",
        slug,
        description: orgName ? `Organization: ${orgName}` : "",
      });
      router.push(`/${workspace.slug}?welcome=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="This is where your mock APIs live. You can invite teammates later."
    >
      <form onSubmit={submit} className="space-y-4">
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
            <span className="text-sm text-muted-foreground shrink-0">backendruntime.com/</span>
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
          {loading ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </AuthLayout>
  );
}
