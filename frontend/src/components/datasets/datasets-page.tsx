"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, Dataset, prettyJSON } from "@/lib/api";
import { FakerGenerator } from "@/components/datasets/faker-generator";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function DatasetsPage({ workspace }: { workspace: string }) {
  const [items, setItems] = useState<Dataset[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [json, setJson] = useState('{\n  "key": "value"\n}');
  const [selected, setSelected] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [list, ws] = await Promise.all([
      api.datasets.list(workspace),
      api.workspaces.get(workspace),
    ]);
    setItems(list);
    setWorkspaceId(ws.id);
  };

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspace]);

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Datasets"
        description="Mock data for rules, responses, and bulk/faker generation"
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-y-auto border-r border-border p-4">
          <Tabs defaultValue="faker">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="faker">Faker</TabsTrigger>
              <TabsTrigger value="manual">Manual JSON</TabsTrigger>
            </TabsList>
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
            {loading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No datasets yet</p>
            ) : (
              items.map((d) => (
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
                <p className="mb-2 font-medium">{selected.name}</p>
                <MonacoEditor
                  height="400px"
                  language="json"
                  theme="vs-dark"
                  value={prettyJSON(selected.data)}
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a dataset or generate bulk data with Faker
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
