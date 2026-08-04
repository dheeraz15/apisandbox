"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Upload, FileJson, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, ImportResult } from "@/lib/api";

type ImportFormat = "postman" | "openapi" | "curl" | "json";

export function ImportDialog({
  workspace,
  workspaceId,
  open,
  onOpenChange,
  onImported,
}: {
  workspace: string;
  workspaceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: (result: ImportResult) => void;
}) {
  const [format, setFormat] = useState<ImportFormat>("postman");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setContent(text);
      if (file.name.includes("postman") || text.includes('"item"')) {
        setFormat("postman");
      } else if (text.trim().startsWith("curl")) {
        setFormat("curl");
      } else if (text.includes('"openapi"') || text.includes('"swagger"')) {
        setFormat("openapi");
      }
    };
    reader.readAsText(file);
  };

  const runPreview = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      let parsed: string | Record<string, unknown>;
      if (format === "curl") {
        parsed = content;
      } else {
        parsed = JSON.parse(content);
      }
      const result = await api.apis.importSpec({
        format,
        content: parsed,
        workspace: workspaceId,
        preview: true,
      });
      setPreview(result as ImportResult);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const runImport = async () => {
    if (!content.trim() || !workspaceId) return;
    setLoading(true);
    try {
      let parsed: string | Record<string, unknown> = content;
      if (format !== "curl") {
        parsed = JSON.parse(content);
      } else {
        parsed = content;
      }
      const result = await api.apis.importSpec({
        format,
        content: parsed,
        workspace: workspaceId,
        deploy: true,
      });
      toast.success(
        `Imported ${result.summary?.api_count ?? result.apis?.length ?? 0} endpoints, ` +
          `${result.summary?.collection_count ?? result.collections?.length ?? 0} collections`
      );
      onImported?.(result);
      onOpenChange(false);
      setContent("");
      setPreview(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import APIs</DialogTitle>
          <DialogDescription>
            Postman collections, OpenAPI/Swagger, curl, or raw JSON — creates collections, endpoints, and mock data automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={(v) => v && setFormat(v as ImportFormat)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postman">Postman Collection</SelectItem>
                  <SelectItem value="openapi">OpenAPI / Swagger</SelectItem>
                  <SelectItem value="curl">curl command</SelectItem>
                  <SelectItem value="json">Raw JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Upload file</Label>
              <Input
                type="file"
                accept=".json,.yaml,.yml,.txt"
                className="mt-1 h-9"
                onChange={handleFile}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Paste content</Label>
            <Textarea
              className="mt-1 min-h-[180px] font-mono text-xs"
              placeholder={
                format === "curl"
                  ? "curl -X POST https://api.example.com/users -d '{\"name\":\"test\"}'"
                  : "Paste Postman collection JSON or OpenAPI spec…"
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {preview?.summary && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Preview</p>
              <p className="mt-1 text-muted-foreground">
                {preview.summary.api_count} endpoints · {preview.summary.collection_count} collections ·{" "}
                {preview.summary.dataset_count} datasets
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={runPreview} disabled={loading || !content.trim()}>
              <FileJson className="mr-1.5 h-4 w-4" /> Preview
            </Button>
            <Button onClick={runImport} disabled={loading || !content.trim()}>
              <Upload className="mr-1.5 h-4 w-4" />
              {loading ? "Importing…" : "Import & deploy"}
            </Button>
            <Link href={`/${workspace}/collections`}>
              <Button variant="ghost">View collections</Button>
            </Link>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Terminal className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Postman folders become collections. Request bodies generate mock responses with faker variables. Collection variables become datasets.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
