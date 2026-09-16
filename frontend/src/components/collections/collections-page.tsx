"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Link2,
  Check,
  Upload,
  Search,
  Rocket,
  Pencil,
  X,
  Unlink,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { api, Collection, MockAPIListItem } from "@/lib/api";
import { downloadJson } from "@/lib/download";
import { MethodBadge } from "@/components/apis/method-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImportDialog } from "@/components/apis/import-dialog";

const COLORS = ["#888888", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function CollectionsPage({ workspace }: { workspace: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Collection[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [apis, setApis] = useState<MockAPIListItem[]>([]);
  const [allApis, setAllApis] = useState<MockAPIListItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState("");
  const [endpointFilter, setEndpointFilter] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [list, ws, apiList] = await Promise.all([
      api.collections.list(workspace),
      api.workspaces.get(workspace),
      api.apis.list(workspace),
    ]);
    setItems(list);
    setWorkspaceId(ws.id);
    setAllApis(apiList.results);
    return list;
  };

  const selectCollection = async (c: Collection) => {
    setSelected(c);
    setEndpointFilter("");
    router.replace(`/${workspace}/collections?c=${c.id}`, { scroll: false });
    const list = await api.collections.apis(c.id);
    setApis(list);
  };

  useEffect(() => {
    load()
      .then((list) => {
        const q = searchParams.get("c");
        if (q) {
          const match = list.find((c) => c.id === q);
          if (match) selectCollection(match);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspace]);

  const create = async () => {
    if (!name.trim()) return;
    try {
      const created = await api.collections.create({
        workspace: workspaceId,
        name: name.trim(),
        description: description.trim(),
        color,
      });
      setName("");
      setDescription("");
      setColor(COLORS[0]);
      toast.success("Collection created");
      const list = await load();
      const fresh = list.find((c) => c.id === created.id) || created;
      selectCollection(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  };

  const saveEdit = async () => {
    if (!selected || !editName.trim()) return;
    try {
      const updated = await api.collections.update(selected.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        color: editColor,
      });
      toast.success("Collection updated");
      setEditOpen(false);
      await load();
      setSelected(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this collection? Endpoints stay in the workspace.")) return;
    await api.collections.delete(id);
    if (selected?.id === id) {
      setSelected(null);
      setApis([]);
      router.replace(`/${workspace}/collections`, { scroll: false });
    }
    toast.success("Collection deleted");
    load();
  };

  const openAddDialog = async () => {
    if (!selected) return;
    const apiList = await api.apis.list(workspace);
    setAllApis(apiList.results);
    setPicked(new Set());
    setAddOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setEditName(selected.name);
    setEditDescription(selected.description || "");
    setEditColor(selected.color || COLORS[0]);
    setEditOpen(true);
  };

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const assignSelected = async () => {
    if (!selected || picked.size === 0) return;
    setAssigning(true);
    try {
      const res = await api.collections.assign(selected.id, Array.from(picked));
      toast.success(`${res.assigned} endpoint(s) added`);
      setAddOpen(false);
      selectCollection(selected);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setAssigning(false);
    }
  };

  const unassignOne = async (apiId: string) => {
    if (!selected) return;
    try {
      await api.collections.unassign(selected.id, [apiId]);
      toast.success("Removed from collection");
      selectCollection(selected);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  const deployAll = async () => {
    if (!selected) return;
    try {
      const res = await api.collections.deployAll(selected.id);
      toast.success(
        res.deployed > 0
          ? `Deployed ${res.deployed} endpoint(s)`
          : "All endpoints already live"
      );
      selectCollection(selected);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    }
  };

  const availableToAdd = allApis.filter(
    (a) => !apis.some((inCol) => inCol.id === a.id)
  );

  const filteredCollections = useMemo(() => {
    const q = sidebarFilter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
    );
  }, [items, sidebarFilter]);

  const filteredApis = useMemo(() => {
    const q = endpointFilter.trim().toLowerCase();
    if (!q) return apis;
    return apis.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.endpoint.toLowerCase().includes(q) ||
        a.method.toLowerCase().includes(q)
    );
  }, [apis, endpointFilter]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {!selected && (
        <PageHeader
          title="Collections"
          description="Group, import, and deploy related endpoints together"
          action={
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
          }
        />
      )}
      {workspaceId && (
        <ImportDialog
          workspace={workspace}
          workspaceId={workspaceId}
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={() => load()}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-72 shrink-0 flex-col border-r border-border">
          <div className="border-b border-border px-3 py-3 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={sidebarFilter}
                onChange={(e) => setSidebarFilter(e.target.value)}
                placeholder="Filter collections…"
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">Loading…</p>
            ) : filteredCollections.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                {items.length === 0
                  ? "No collections yet — create one below."
                  : "No matches."}
              </p>
            ) : (
              filteredCollections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCollection(c)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent/50 ${
                    selected?.id === c.id ? "bg-accent" : ""
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color || "#888" }}
                  />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <Badge variant="secondary" className="text-[10px] tabular-nums">
                    {c.api_count}
                  </Badge>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border p-3 space-y-2">
            <Label className="text-xs">New collection</Label>
            <Input
              placeholder="Payments API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <Textarea
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[56px] text-sm resize-none"
            />
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full border ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <Button size="sm" className="w-full h-8" onClick={create} disabled={!name.trim()}>
              <Plus className="mr-1 h-3 w-3" /> Create
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: selected.color || "#888" }}
                    />
                    <h1 className="truncate text-lg font-semibold tracking-tight">
                      {selected.name}
                    </h1>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.description || "No description"} · {apis.length} endpoints
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={openEdit}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={deployAll}>
                    <Rocket className="mr-1.5 h-3.5 w-3.5" /> Deploy all
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const data = await api.collections.export(
                          selected.id,
                          "openapi"
                        );
                        downloadJson(
                          `${selected.name.replace(/\s+/g, "-").toLowerCase()}.openapi.json`,
                          data
                        );
                        toast.success("Exported OpenAPI");
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Export failed"
                        );
                      }
                    }}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> OpenAPI
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const data = await api.collections.export(
                          selected.id,
                          "postman"
                        );
                        downloadJson(
                          `${selected.name.replace(/\s+/g, "-").toLowerCase()}.postman.json`,
                          data
                        );
                        toast.success("Exported Postman");
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Export failed"
                        );
                      }
                    }}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Postman
                  </Button>
                  <Button size="sm" variant="outline" onClick={openAddDialog}>
                    <Link2 className="mr-1.5 h-3.5 w-3.5" /> Add existing
                  </Button>
                  <Link href={`/${workspace}/apis/new?collection=${selected.id}`}>
                    <Button size="sm">
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> New endpoint
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => remove(selected.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelected(null);
                      setApis([]);
                      router.replace(`/${workspace}/collections`, { scroll: false });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {apis.length > 0 && (
                <div className="border-b border-border px-6 py-3">
                  <div className="relative max-w-sm">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={endpointFilter}
                      onChange={(e) => setEndpointFilter(e.target.value)}
                      placeholder="Filter endpoints…"
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>
              )}

              {apis.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Empty collection. Create an endpoint, add existing ones, or import a
                    Postman / OpenAPI spec.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={openAddDialog}>
                      Add existing
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                      Import
                    </Button>
                    <Link href={`/${workspace}/apis/new?collection=${selected.id}`}>
                      <Button size="sm">Create endpoint</Button>
                    </Link>
                  </div>
                </div>
              ) : filteredApis.length === 0 ? (
                <p className="px-6 py-10 text-sm text-muted-foreground">No matching endpoints.</p>
              ) : (
                filteredApis.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between border-b border-border px-6 py-3 hover:bg-accent/30"
                  >
                    <Link
                      href={`/${workspace}/apis/${item.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <MethodBadge method={item.method} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {item.endpoint}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.is_deployed ? (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Live
                        </span>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                      <span className="tabular-nums">{item.request_count_today} today</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        title="Remove from collection"
                        onClick={() => unassignOne(item.id)}
                      >
                        <Unlink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
              <h2 className="text-base font-medium">Organize your mock surface</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Collections group related endpoints for a product, partner, or team —
                then deploy them together. Import Postman or OpenAPI to bootstrap instantly.
              </p>
              <div className="mt-6 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Import spec
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add endpoints to {selected?.name}</DialogTitle>
            <DialogDescription>
              Pick workspace endpoints that aren&apos;t in this collection yet.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {availableToAdd.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nothing left to add — create a new endpoint instead.
              </p>
            ) : (
              availableToAdd.map((item) => (
                <button
                  key={item.id}
                  onClick={() => togglePick(item.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent/50 ${
                    picked.has(item.id) ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MethodBadge method={item.method} />
                    <span className="truncate">{item.name}</span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {item.endpoint}
                    </span>
                  </div>
                  {picked.has(item.id) && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={assignSelected} disabled={picked.size === 0 || assigning}>
              {assigning
                ? "Adding…"
                : `Add ${picked.size || ""} endpoint${picked.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit collection</DialogTitle>
            <DialogDescription>Rename, describe, and recolor this group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  className={`h-5 w-5 rounded-full border ${
                    editColor === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!editName.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
