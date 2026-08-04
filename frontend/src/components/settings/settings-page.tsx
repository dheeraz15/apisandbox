"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Globe, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, Workspace, WorkspaceMember, WorkspaceDomain } from "@/lib/api";

const ROLES = ["manager", "editor", "viewer"] as const;

function getMockApiBase(workspace: string, domain?: string) {
  if (domain) return `https://${domain}/api/${workspace}`;
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000/api/${workspace}`;
  }
  return `http://localhost:8000/api/${workspace}`;
}

export function SettingsPage({ workspace }: { workspace: string }) {
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [domains, setDomains] = useState<WorkspaceDomain[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [newDomain, setNewDomain] = useState("");

  const load = async () => {
    const [w, m, d] = await Promise.all([
      api.workspaces.get(workspace),
      api.workspaces.members.list(workspace).catch(() => [] as WorkspaceMember[]),
      api.workspaces.domains.list(workspace).catch(() => [] as WorkspaceDomain[]),
    ]);
    setWs(w);
    setMembers(m);
    setDomains(d);
  };

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspace]);

  const canManage =
    ws?.my_role === "owner" || ws?.my_role === "manager";

  const invite = async () => {
    try {
      const res = await api.workspaces.members.invite(workspace, { email, role });
      toast.success(
        "message" in res && typeof res.message === "string" ? res.message : "Member added"
      );
      setEmail("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    try {
      await api.workspaces.domains.add(workspace, newDomain.trim());
      setNewDomain("");
      toast.success("Domain added");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add domain");
    }
  };

  const verifyDomain = async (id: string) => {
    try {
      await api.workspaces.domains.verify(workspace, id);
      toast.success("Domain marked verified");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verify failed");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader title="Settings" description="Workspace, domains, and team" />
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading settings…
        </div>
      </div>
    );
  }

  const primaryDomain = domains.find((d) => d.verified)?.domain;
  const apiBase = getMockApiBase(workspace, primaryDomain);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader title="Settings" description="Workspace, domains, and team" />

      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <section className="rounded-lg border border-border p-4 space-y-3">
          <h2 className="text-sm font-medium">Workspace</h2>
          <div className="grid gap-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name · </span>
              {ws?.name}
            </p>
            <p>
              <span className="text-muted-foreground">Slug · </span>
              <code className="font-mono text-xs">{ws?.slug}</code>
            </p>
            {ws?.my_role && <Badge variant="secondary">Your role: {ws.my_role}</Badge>}
          </div>
        </section>

        <section className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              API base URL
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Default mock endpoint prefix for this workspace
            </p>
          </div>
          <code className="block rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs break-all">
            {apiBase}/your-endpoint
          </code>
        </section>

        <section className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <h2 className="text-sm font-medium">Custom domains</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Point a CNAME to your MockAPI host, then add the domain here. Use verified domains in docs and client configs.
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Input
                placeholder="api.yourcompany.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="h-9"
              />
              <Button onClick={addDomain} className="h-9">Add domain</Button>
            </div>
          )}
          <div className="divide-y divide-border rounded-md border border-border">
            {domains.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <code className="text-sm">{d.domain}</code>
                  {d.verified ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {canManage && !d.verified && (
                    <Button variant="outline" size="sm" onClick={() => verifyDomain(d.id)}>
                      Mark verified
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        api.workspaces.domains.delete(workspace, d.id).then(load)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {domains.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No custom domains yet</p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            DNS: CNAME <code className="font-mono">api.yourcompany.com</code> → your MockAPI deployment host
          </p>
        </section>

        <section className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <h2 className="text-sm font-medium">Team</h2>
            <p className="text-xs text-muted-foreground">
              RBAC: owner · manager · editor · viewer
            </p>
          </div>

          {canManage && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[180px]">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@company.com"
                />
              </div>
              <div className="w-32">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => v && setRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={invite}>
                <UserPlus className="mr-1.5 h-4 w-4" /> Invite
              </Button>
            </div>
          )}

          <div className="divide-y divide-border rounded-md border border-border">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <p className="text-sm">{m.user.name || m.user.email}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{m.role}</Badge>
                  {canManage && m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => api.workspaces.members.remove(workspace, m.id).then(load)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
