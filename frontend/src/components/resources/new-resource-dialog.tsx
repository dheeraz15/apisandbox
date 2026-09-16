"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, Resource } from "@/lib/api";
import { TemplatePalette } from "@/components/apis/template-palette";

/** Shapes people reach for first, so the blank page is never the starting point. */
const PRESETS: {
  label: string;
  name: string;
  path: string;
  template: Record<string, string>;
}[] = [
  {
    label: "Users",
    name: "User",
    path: "/users",
    template: {
      id: "{{uuid}}",
      name: "{{faker.name}}",
      email: "{{faker.email}}",
      role: "{{randomFrom:admin|member|viewer}}",
      createdAt: "{{dateOffset:-30d}}",
    },
  },
  {
    label: "Accounts",
    name: "Account",
    path: "/accounts",
    template: {
      id: "{{uuid}}",
      holder: "{{faker.name}}",
      balance: "{{randomFloat}}",
      currency: "USD",
      status: "{{randomFrom:ACTIVE|FROZEN|CLOSED}}",
    },
  },
  {
    label: "Orders",
    name: "Order",
    path: "/orders",
    template: {
      id: "{{uuid}}",
      customer: "{{faker.name}}",
      total: "{{randomFloat}}",
      status: "{{randomFrom:pending|shipped|delivered}}",
      placedAt: "{{dateOffset:-7d}}",
    },
  },
  {
    label: "Products",
    name: "Product",
    path: "/products",
    template: {
      id: "{{uuid}}",
      title: "{{faker.catch_phrase}}",
      price: "{{randomFloat}}",
      inStock: "{{randomBool}}",
    },
  },
];

const slugifyPath = (value: string) =>
  "/" +
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\/+|\/+$/g, "");

export function NewResourceDialog({
  workspace,
  open,
  onOpenChange,
  onCreated,
}: {
  workspace: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (resource: Resource) => void;
}) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState(
    JSON.stringify(PRESETS[0].template, null, 2)
  );
  const [seedCount, setSeedCount] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const preset = PRESETS[0];
    setName(preset.name);
    setPath(preset.path);
    setDescription("");
    setTemplate(JSON.stringify(preset.template, null, 2));
    setSeedCount(10);
    setError("");
  }, [open]);

  const templateError = useMemo(() => {
    try {
      const parsed = JSON.parse(template);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return "The record shape has to be a JSON object.";
      }
      return "";
    } catch {
      return "That is not valid JSON yet.";
    }
  }, [template]);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setName(preset.name);
    setPath(preset.path);
    setTemplate(JSON.stringify(preset.template, null, 2));
  };

  const submit = async () => {
    if (templateError) return;
    setSaving(true);
    setError("");
    try {
      const resource = await api.resources.create({
        workspace,
        name: name.trim() || "Resource",
        path: slugifyPath(path || name),
        description: description.trim(),
        item_template: JSON.parse(template),
        seed_count: seedCount,
      });
      toast.success(`${resource.name} is live at ${resource.path}`);
      onCreated(resource);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the resource");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New resource</DialogTitle>
          <DialogDescription>
            One path that answers list, read, create, update and delete against
            a shared store.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Start from</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  size="xs"
                  variant={path === preset.path ? "secondary" : "outline"}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="resource-name">Name</Label>
              <Input
                id="resource-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Account"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Singular reads best, since it names one item.
              </p>
            </div>
            <div>
              <Label htmlFor="resource-path">Path</Label>
              <Input
                id="resource-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onBlur={() => setPath(slugifyPath(path || name))}
                placeholder="/accounts"
                className="font-mono"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Item routes like{" "}
                <code className="font-mono">{slugifyPath(path || "/accounts")}/{"{id}"}</code>{" "}
                are added for you.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="resource-description">Description</Label>
            <Textarea
              id="resource-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this collection represents"
            />
          </div>

          <div>
            <Label>Record shape</Label>
            <div className="mt-1.5 grid gap-3 lg:grid-cols-[1fr_240px]">
              <div>
                <Textarea
                  rows={12}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="font-mono text-xs"
                  spellCheck={false}
                />
                {templateError ? (
                  <p className="mt-1 text-[11px] text-red-400">{templateError}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Generated records use this shape. Anything posted to the
                    resource is merged over it.
                  </p>
                )}
              </div>
              <div className="h-[260px] rounded-lg border border-border p-2">
                <TemplatePalette />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="resource-seed">Records to generate</Label>
            <Input
              id="resource-seed"
              type="number"
              min={0}
              max={500}
              value={seedCount}
              onChange={(e) =>
                setSeedCount(Math.max(0, parseInt(e.target.value) || 0))
              }
              className="max-w-32"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Starting with data means the list route returns something
              immediately. You can add or clear records later.
            </p>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || Boolean(templateError)}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Create resource
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
