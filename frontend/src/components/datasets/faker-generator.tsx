"use client";

import { useState } from "react";
import { faker } from "@faker-js/faker";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Wand2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const FAKER_TYPES = [
  { value: "person.fullName", label: "Full name" },
  { value: "person.firstName", label: "First name" },
  { value: "person.lastName", label: "Last name" },
  { value: "internet.email", label: "Email" },
  { value: "phone.number", label: "Phone" },
  { value: "company.name", label: "Company" },
  { value: "location.city", label: "City" },
  { value: "location.country", label: "Country" },
  { value: "finance.amount", label: "Amount" },
  { value: "finance.accountNumber", label: "Account number" },
  { value: "string.uuid", label: "UUID" },
  { value: "number.int", label: "Integer (1–1000)" },
  { value: "datatype.boolean", label: "Boolean" },
  { value: "date.past", label: "Past date" },
  { value: "commerce.productName", label: "Product name" },
  { value: "commerce.price", label: "Price" },
  { value: "lorem.sentence", label: "Sentence" },
];

type Column = { key: string; faker: string };

function runFaker(path: string): unknown {
  try {
    if (path === "number.int") return faker.number.int({ min: 1, max: 1000 });
    const [ns, method] = path.split(".");
    if (!ns || !method) return path;
    const namespace = (faker as unknown as Record<string, Record<string, () => unknown>>)[ns];
    const fn = namespace?.[method];
    if (typeof fn !== "function") return path;
    return fn();
  } catch {
    return path;
  }
}

function generateRows(columns: Column[], count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, () => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      if (!col.key.trim()) continue;
      row[col.key.trim()] = runFaker(col.faker);
    }
    return row;
  });
}

export function FakerGenerator({
  workspaceId,
  onCreated,
}: {
  workspaceId: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("Generated dataset");
  const [count, setCount] = useState(25);
  const [columns, setColumns] = useState<Column[]>([
    { key: "id", faker: "string.uuid" },
    { key: "name", faker: "person.fullName" },
    { key: "email", faker: "internet.email" },
  ]);
  const [preview, setPreview] = useState("[]");
  const [saving, setSaving] = useState(false);

  const refreshPreview = () => {
    const rows = generateRows(columns, Math.min(count, 5));
    setPreview(JSON.stringify(rows, null, 2));
  };

  const addColumn = () => setColumns((c) => [...c, { key: "", faker: "person.fullName" }]);

  const removeColumn = (i: number) =>
    setColumns((c) => c.filter((_, idx) => idx !== i));

  const updateColumn = (i: number, patch: Partial<Column>) =>
    setColumns((c) => c.map((col, idx) => (idx === i ? { ...col, ...patch } : col)));

  const save = async () => {
    if (!name.trim()) {
      toast.error("Dataset name required");
      return;
    }
    const validCols = columns.filter((c) => c.key.trim());
    if (!validCols.length) {
      toast.error("Add at least one column");
      return;
    }
    setSaving(true);
    try {
      const rows = generateRows(validCols, count);
      await api.datasets.create({
        workspace: workspaceId,
        name,
        data: { records: rows, meta: { generated: true, count: rows.length } },
      });
      toast.success(`${rows.length} records saved as dataset`);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Faker bulk generator</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Define columns and faker types — generate hundreds of realistic records for rules and responses.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Dataset name</Label>
          <Input
            className="mt-1 h-8"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Row count</Label>
          <Input
            type="number"
            min={1}
            max={10000}
            className="mt-1 h-8"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Columns</Label>
        {columns.map((col, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="fieldName"
              className="h-8 font-mono text-xs"
              value={col.key}
              onChange={(e) => updateColumn(i, { key: e.target.value })}
            />
            <Select
              value={col.faker}
              onValueChange={(v) => v && updateColumn(i, { faker: v })}
            >
              <SelectTrigger className="h-8 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FAKER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeColumn(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="h-7" onClick={addColumn}>
          <Plus className="mr-1 h-3 w-3" /> Column
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={refreshPreview}>
          Preview (5 rows)
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : `Generate ${count} rows`}
        </Button>
      </div>

      {preview !== "[]" && (
        <MonacoEditor
          height="160px"
          language="json"
          theme="vs-dark"
          value={preview}
          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 11 }}
        />
      )}
    </div>
  );
}
