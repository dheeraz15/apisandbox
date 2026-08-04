"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  UserPlus,
  Trash2,
  Loader2,
  Globe,
  CheckCircle2,
  Copy,
  Star,
  RefreshCw,
} from "lucide-react";
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
import {
  api,
  Workspace,
  WorkspaceMember,
  WorkspaceDomain,
  getPlatformMockBase,
} from "@/lib/api";
import { GoogleLinkCard } from "@/components/settings/google-link-card";

const ROLES = ["manager", "editor", "viewer"] as const;

export function SettingsPage({ workspace }: { workspace: string }) {
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [domains, setDomains] = useState<WorkspaceDomain[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [newDomain, setNewDomain] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [setupDomainId, setSetupDomainId] = useState<string | null>(null);

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
      const res = await api.workspaces.domains.add(workspace, newDomain.trim());
      setNewDomain("");
      setSetupDomainId(res.id);
      toast.success("Domain added — configure DNS then verify");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add domain");
    }
  };

  const verifyDomain = async (id: string) => {
    setVerifyingId(id);
    try {
      const res = await api.workspaces.domains.verify(workspace, id);
      toast.success(res.message || "Domain verified");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const setDefault = async (id: string | null) => {
    try {
      const res = await api.workspaces.domains.setDefault(workspace, id);
      toast.success(res.message);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to set default");
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
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

  const defaultCustom = domains.find((d) => d.verified && d.is_default);
  const platformBase = getPlatformMockBase(workspace);
  const activeBase = defaultCustom
    ? `https://${defaultCustom.domain}`
    : platformBase;
  const cnameTarget =
    domains[0]?.cname_target ||
    (typeof window !== "undefined" ? window.location.hostname : "api.dhirajchapagain.com.np");

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

        <GoogleLinkCard />

        <section className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              API base URL
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              New endpoints use the default domain below. Override per endpoint when creating.
            </p>
          </div>
          <code className="block rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs break-all">
            {activeBase}/your-endpoint
          </code>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Default domain for new endpoints</Label>
            <Select
              value={defaultCustom?.id || "platform"}
              onValueChange={(v) => {
                if (!canManage || !v) return;
                setDefault(v === "platform" ? null : v);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value || value === "platform") {
                      return `Platform · ${platformBase}`;
                    }
                    const match = domains.find((d) => d.id === value);
                    return match?.domain || "Custom domain";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform" label={`Platform · ${platformBase}`}>
                  Platform · {platformBase}
                </SelectItem>
                {domains.filter((d) => d.verified).map((d) => (
                  <SelectItem key={d.id} value={d.id} label={d.domain}>
                    {d.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <h2 className="text-sm font-medium">Custom domains</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Point a CNAME to <code className="font-mono">{cnameTarget}</code>, verify DNS,
              then bind endpoints to your domain. Requests hit{" "}
              <code className="font-mono">https://your.domain/path</code> directly.
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/20 p-3 text-xs space-y-2">
            <p className="font-medium text-foreground">DNS setup (Cloudflare / any provider)</p>
            <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
              <li>
                Add a <strong className="text-foreground">CNAME</strong> record:{" "}
                <code className="font-mono text-foreground">api</code> (or your subdomain) →{" "}
                <code className="font-mono text-foreground">{cnameTarget}</code>
              </li>
              <li>
                Cloudflare: turn <strong className="text-foreground">Proxy ON</strong> (orange cloud)
                so HTTPS works on your domain.
              </li>
              <li>Optional TXT for ownership (shown per domain after adding).</li>
              <li>Click <strong className="text-foreground">Verify DNS</strong> once records propagate.</li>
            </ol>
          </div>

          {canManage && (
            <div className="flex gap-2">
              <Input
                placeholder="api.yourcompany.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="h-9"
                onKeyDown={(e) => e.key === "Enter" && addDomain()}
              />
              <Button onClick={addDomain} className="h-9">Add domain</Button>
            </div>
          )}

          <div className="divide-y divide-border rounded-md border border-border">
            {domains.map((d) => {
              const open = setupDomainId === d.id || !d.verified;
              return (
                <div key={d.id} className="px-3 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <code className="text-sm truncate">{d.domain}</code>
                      {d.verified ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending DNS</Badge>
                      )}
                      {d.is_default && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3" /> Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {canManage && d.verified && !d.is_default && (
                        <Button variant="outline" size="sm" onClick={() => setDefault(d.id)}>
                          Make default
                        </Button>
                      )}
                      {canManage && !d.verified && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={verifyingId === d.id}
                          onClick={() => verifyDomain(d.id)}
                        >
                          {verifyingId === d.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          Verify DNS
                        </Button>
                      )}
                      {canManage && d.verified && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={verifyingId === d.id}
                          onClick={() => verifyDomain(d.id)}
                        >
                          Re-check
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

                  {open && (
                    <div className="rounded-md border border-dashed border-border bg-background/50 p-3 space-y-2 text-xs">
                      <DnsRow
                        label="CNAME"
                        value={`${d.domain} → ${d.cname_target}`}
                        onCopy={() => copy(d.cname_target, "CNAME target")}
                      />
                      <DnsRow
                        label="TXT name"
                        value={d.txt_name}
                        onCopy={() => copy(d.txt_name, "TXT name")}
                      />
                      <DnsRow
                        label="TXT value"
                        value={d.txt_value || d.verification_token}
                        onCopy={() =>
                          copy(d.txt_value || d.verification_token, "TXT value")
                        }
                      />
                      <p className="text-muted-foreground pt-1">
                        After verify, endpoints on this domain are live at{" "}
                        <code className="font-mono text-foreground">
                          https://{d.domain}/your-path
                        </code>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            {domains.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No custom domains yet</p>
            )}
          </div>
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

function DnsRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <code className="font-mono text-[11px] break-all">{value}</code>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCopy}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
