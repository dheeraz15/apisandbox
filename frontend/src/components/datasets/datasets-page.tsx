"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Plus, Search, Trash2, Download } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  api,
  Dataset,
  DatasetCatalogItem,
  prettyJSON,
} from "@/lib/api";
import { FakerGenerator } from "@/components/datasets/faker-generator";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function DatasetsPage({ workspace }: { workspace: string }) {
  const [items, setItems] = useState<Dataset[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [json, setJson] = useState('{\n  "key": "value"\n}');
  const [selected, setSelected] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [listQuery, setListQuery] = useState("");
  const [catalog, setCatalog] = useState<DatasetCatalogItem[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [importingKey, setImportingKey] = useState<string | null>(null);

  const load = async () => {
    const [list, ws] = await Promise.all([
      api.datasets.list(workspace, listQuery || undefined),
      api.workspaces.get(workspace),
    ]);
    setItems(list);
    setWorkspaceId(ws.id);
  };

  const loadCatalog = async () => {
    const res = await api.datasets.catalog({
      q: catalogQuery || undefined,
      category: catalogCategory === "all" ? undefined : catalogCategory,
    });
    setCatalog(res.results);
    setCatalogCategories(res.categories);
  };

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspace, listQuery]);

  useEffect(() => {
    loadCatalog().catch(console.error);
  }, [catalogQuery, catalogCategory]);

  const create = async () => {
    try {
      const data = JSON.parse(json);
      await api.datasets.create({ workspace: workspaceId, name, data });
      setName("");
      toast.success("Dataset created");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const importFromCatalog = async (item: DatasetCatalogItem) => {
    if (!workspaceId) return;
    setImportingKey(item.key);
    try {
      const ds = await api.datasets.fromCatalog({
        key: item.key,
        workspace: workspaceId,
      });
      toast.success(`Added “${ds.name}” to workspace`);
      await load();
      setSelected(ds);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportingKey(null);
    }
  };

  const filteredLocal = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q)
    );
  }, [items, listQuery]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Datasets"
        description="Search premade catalogs or build your own mock data"
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[340px] shrink-0 overflow-y-auto border-r border-border p-4">
          <Tabs defaultValue="catalog">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="catalog">Catalog</TabsTrigger>
              <TabsTrigger value="faker">Faker</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="mt-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-9 pl-8"
                  placeholder="Search premade datasets…"
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                />
              </div>
              <Select
                value={catalogCategory}
                onValueChange={(v) => v && setCatalogCategory(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {catalogCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                {catalog.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {item.record_count} records
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        disabled={importingKey === item.key}
                        onClick={() => importFromCatalog(item)}
                      >
                        <Download className="h-3 w-3" />
                        Use
                      </Button>
                    </div>
                  </div>
                ))}
                {catalog.length === 0 && (
                  <p className="text-sm text-muted-foreground">No catalog matches</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="faker" className="mt-3">
              {workspaceId && (
                <FakerGenerator workspaceId={workspaceId} onCreated={load} />
              )}
            </TabsContent>
            <TabsContent value="manual" className="mt-3 space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <Label>JSON data</Label>
              <MonacoEditor
                height="160px"
                language="json"
                theme="vs-dark"
                value={json}
                onChange={(v) => setJson(v || "{}")}
                options={{ minimap: { enabled: false }, fontSize: 12 }}
              />
              <Button className="w-full" onClick={create}>
                <Plus className="mr-1.5 h-4 w-4" /> Create dataset
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 shrink-0 overflow-y-auto border-r border-border p-3">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-7 text-xs"
                placeholder="Filter workspace…"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
              />
            </div>
            {loading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading…</p>
            ) : filteredLocal.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No datasets yet</p>
            ) : (
              filteredLocal.map((d) => (
                <div
                  key={d.id}
                  className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/40 ${
                    selected?.id === d.id ? "bg-muted" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => setSelected(d)}
                  >
                    {d.name}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
                    onClick={() => api.datasets.delete(d.id).then(load)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex-1 p-4">
            {selected ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{selected.name}</h3>
                    {selected.description && (
                      <p className="text-xs text-muted-foreground">{selected.description}</p>
                    )}
                  </div>
                </div>
                <pre className="overflow-auto rounded-lg border border-border bg-[#0a0a0a] p-4 font-mono text-xs text-muted-foreground">
                  {prettyJSON(selected.data)}
                </pre>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a workspace dataset, or import one from the catalog.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
