"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, WorkspaceVariable } from "@/lib/api";

export function VariablesPage({ workspace }: { workspace: string }) {
  const [items, setItems] = useState<WorkspaceVariable[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const load = () =>
    api.workspaces.variables.list(workspace).then(setItems).catch(console.error);

  useEffect(() => {
    load();
  }, [workspace]);

  const save = async () => {
    if (!key.trim()) return;
    try {
      await api.workspaces.variables.upsert(workspace, {
        key: key.toUpperCase().replace(/\s+/g, "_"),
        value,
        is_secret: isSecret,
      });
      setKey("");
      setValue("");
      toast.success("Variable saved — use {{env.KEY}} in responses");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <>
      <Header
        workspace={workspace}
        title="Variables"
        description="Workspace env vars — BANK_NAME, API_KEY, CURRENCY…"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 rounded-lg border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>Key</Label>
              <Input
                className="font-mono"
                placeholder="BANK_NAME"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Value</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                />
                Secret
              </label>
              <Button onClick={save}>
                <Plus className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Reference in responses as {"{{env.BANK_NAME}}"}
          </p>
        </div>

        <div className="rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_1fr_80px_60px] gap-3 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Key</span>
            <span>Value</span>
            <span>Type</span>
            <span />
          </div>
          {items.map((v) => (
            <div
              key={v.id}
              className="grid grid-cols-[1fr_1fr_80px_60px] items-center gap-3 border-b border-border px-4 py-3 last:border-0"
            >
              <span className="font-mono text-sm">{"{{env." + v.key + "}}"}</span>
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-sm text-muted-foreground">
                  {v.is_secret && !revealed[v.id] ? "••••••••" : v.value}
                </span>
                {v.is_secret && (
                  <button
                    onClick={() =>
                      setRevealed((r) => ({ ...r, [v.id]: !r[v.id] }))
                    }
                  >
                    {revealed[v.id] ? (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {v.is_secret ? "secret" : "plain"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  api.workspaces.variables.delete(workspace, v.id).then(load)
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No variables yet</p>
          )}
        </div>
      </div>
    </>
  );
}
