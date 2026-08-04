"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Copy, Trash2, Rocket, MoreHorizontal, Search, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MethodBadge } from "@/components/apis/method-badge";
import { ImportDialog } from "@/components/apis/import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, MockAPIListItem } from "@/lib/api";

interface APIsPageProps {
  workspace: string;
}

export function APIsPage({ workspace }: APIsPageProps) {
  const [apis, setApis] = useState<MockAPIListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api.apis
      .list(workspace, search ? { search } : undefined)
      .then((res) => setApis(res.results))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.workspaces.get(workspace).then((w) => setWorkspaceId(w.id)).catch(() => {});
  }, [workspace]);

  const handleDeploy = async (id: string) => {
    try {
      await api.apis.deploy(id);
      toast.success("Endpoint deployed");
      load();
    } catch {
      toast.error("Deploy failed");
    }
  };

  const handleClone = async (id: string) => {
    try {
      await api.apis.clone(id);
      toast.success("Endpoint duplicated");
      load();
    } catch {
      toast.error("Duplicate failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this endpoint?")) return;
    try {
      await api.apis.delete(id);
      toast.success("Endpoint deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Endpoints"
        description={`${apis.length} mock API${apis.length === 1 ? "" : "s"}`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search…"
                className="h-8 pl-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            <Link href={`/${workspace}/apis/new`}>
              <Button size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New endpoint
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
          </div>
        }
      />
      {workspaceId && (
        <ImportDialog
          workspace={workspace}
          workspaceId={workspaceId}
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={() => load()}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[72px_1fr_100px_80px_100px_72px_40px] gap-2 border-b border-border px-6 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Method</span>
          <span>Endpoint</span>
          <span>Scenario</span>
          <span>Today</span>
          <span>Last hit</span>
          <span>Status</span>
          <span />
        </div>

        {loading ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</p>
        ) : apis.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <p className="text-sm text-muted-foreground">No endpoints yet</p>
            <Link href={`/${workspace}/apis/new`}>
              <Button size="sm" className="mt-4">
                Create your first endpoint
              </Button>
            </Link>
          </div>
        ) : (
          apis.map((apiItem) => (
            <div
              key={apiItem.id}
              className="grid grid-cols-[72px_1fr_100px_80px_100px_72px_40px] items-center gap-2 border-b border-border px-6 py-3 last:border-0 hover:bg-accent/30 transition-colors"
            >
              <MethodBadge method={apiItem.method} />
              <Link
                href={`/${workspace}/apis/${apiItem.id}`}
                className="min-w-0 hover:underline"
              >
                <p className="truncate text-sm font-medium">{apiItem.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {apiItem.endpoint}
                  {apiItem.endpoint_type ? (
                    <span className="ml-2 capitalize text-muted-foreground/70">
                      · {apiItem.endpoint_type}
                    </span>
                  ) : null}
                </p>
              </Link>
              <span className="truncate text-xs text-muted-foreground">
                {apiItem.active_scenario}
              </span>
              <span className="text-sm tabular-nums">{apiItem.request_count_today}</span>
              <span className="text-xs text-muted-foreground">
                {apiItem.last_hit_at
                  ? formatDistanceToNow(new Date(apiItem.last_hit_at), { addSuffix: true })
                  : "—"}
              </span>
              <div>
                {apiItem.is_deployed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Draft</span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {!apiItem.is_deployed && (
                    <DropdownMenuItem onClick={() => handleDeploy(apiItem.id)}>
                      <Rocket className="mr-2 h-4 w-4" /> Deploy
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleClone(apiItem.id)}>
                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(apiItem.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
