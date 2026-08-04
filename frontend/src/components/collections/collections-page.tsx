"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Link2, Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, Collection, MockAPIListItem } from "@/lib/api";
import { MethodBadge } from "@/components/apis/method-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImportDialog } from "@/components/apis/import-dialog";

export function CollectionsPage({ workspace }: { workspace: string }) {
  const [items, setItems] = useState<Collection[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Collection | null>(null);
  const [apis, setApis] = useState<MockAPIListItem[]>([]);
  const [allApis, setAllApis] = useState<MockAPIListItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = async () => {
    const [list, ws, apiList] = await Promise.all([
      api.collections.list(workspace),
      api.workspaces.get(workspace),
      api.apis.list(workspace),
    ]);
    setItems(list);
    setWorkspaceId(ws.id);
    setAllApis(apiList.results);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [workspace]);

  const selectCollection = async (c: Collection) => {
    setSelected(c);
    const list = await api.collections.apis(c.id);
    setApis(list);
  };

  const create = async () => {
    if (!name.trim()) return;
    await api.collections.create({
      workspace: workspaceId,
      name,
      description,
      color: "#888",
    });
    setName("");
    setDescription("");
    toast.success("Collection created");
    load();
  };

  const remove = async (id: string) => {
    await api.collections.delete(id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  const openAddDialog = () => {
    if (!selected) return;
    const inCollection = new Set(apis.map((a) => a.id));
    setPicked(new Set());
    setAddOpen(true);
    setAllApis((prev) => prev);
    // pre-select none; show apis not in collection as available
    void inCollection;
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
      toast.success(`${res.assigned} endpoint(s) added to collection`);
      setAddOpen(false);
      selectCollection(selected);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setAssigning(false);
    }
  };

  const availableToAdd = allApis.filter(
    (a) => !apis.some((inCol) => inCol.id === a.id)
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {!selected && (
        <PageHeader
          title="Collections"
          description="Group endpoints by product, team, or domain"
          action={
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              Import Postman / OpenAPI
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
        <div className="w-64 shrink-0 border-r border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Collections
            </p>
          </div>
          <div className="p-3 space-y-1">
            {items.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCollection(c)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent/50 ${
                  selected?.id === c.id ? "bg-accent" : ""
                }`}
              >
                <span className="truncate">{c.name}</span>
                <Badge variant="secondary" className="text-[10px] tabular-nums">
                  {c.api_count}
                </Badge>
              </button>
            ))}
          </div>
          <div className="border-t border-border p-3 space-y-2">
            <Label className="text-xs">New collection</Label>
            <Input
              placeholder="Payments API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
            <Button size="sm" className="w-full h-8" onClick={create}>
              <Plus className="mr-1 h-3 w-3" /> Create
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">{selected.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {selected.description || "No description"} · {apis.length} endpoints
                  </p>
                </div>
                <div className="flex gap-2">
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
                </div>
              </div>
              {apis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No endpoints in this collection yet. Create a new one or add existing endpoints from your workspace.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" onClick={openAddDialog}>
                      Add existing endpoints
                    </Button>
                    <Link href={`/${workspace}/apis/new?collection=${selected.id}`}>
                      <Button size="sm">Create endpoint</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                apis.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${workspace}/apis/${item.id}`}
                    className="flex items-center justify-between border-b border-border px-6 py-3 hover:bg-accent/30"
                  >
                    <div className="flex items-center gap-3">
                      <MethodBadge method={item.method} />
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item.endpoint}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.is_deployed && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                      <span>{item.request_count_today} today</span>
                    </div>
                  </Link>
                ))
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <p className="text-sm text-muted-foreground max-w-md">
                Collections group related endpoints — e.g. all Payment APIs or your mobile app mocks.
                Select one from the sidebar or create a new collection.
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add endpoints to {selected?.name}</DialogTitle>
            <DialogDescription>
              Select existing endpoints from your workspace to include in this collection.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {availableToAdd.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground text-center">
                All endpoints are already in this collection, or you have no endpoints yet.
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
                  <div className="flex items-center gap-2 min-w-0">
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
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={assignSelected}
              disabled={picked.size === 0 || assigning}
            >
              {assigning ? "Adding…" : `Add ${picked.size || ""} endpoint${picked.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
