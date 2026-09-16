"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Boxes, Database, Loader2, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MethodBadge } from "@/components/apis/method-badge";
import { Button } from "@/components/ui/button";
import { api, ApiError, Resource } from "@/lib/api";
import { NewResourceDialog } from "./new-resource-dialog";
import { RecordsTable } from "./records-table";

export function ResourcesPage({ workspace }: { workspace: string }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    async (keepSelection = true) => {
      setError("");
      try {
        const list = await api.resources.list(workspace);
        setResources(list);
        setSelected((current) => {
          if (!keepSelection || !current) return list[0] ?? null;
          return list.find((r) => r.id === current.id) ?? list[0] ?? null;
        });
      } catch (e) {
        setError(
          e instanceof ApiError && e.isTransient
            ? "Could not reach the API. Is the backend running?"
            : e instanceof Error
              ? e.message
              : "Could not load resources"
        );
      } finally {
        setLoading(false);
      }
    },
    [workspace]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const remove = async (resource: Resource) => {
    if (
      !window.confirm(
        `Delete ${resource.name} and its ${resource.record_count} records? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.resources.delete(resource.id);
      toast.success(`Deleted ${resource.name}`);
      await load(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Resources"
        description="A path with every CRUD operation, backed by one store"
        action={
          resources.length > 0 ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" />
              New resource
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(false)} />
      ) : resources.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-border">
            <ul className="p-2">
              {resources.map((resource) => (
                <li key={resource.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(resource)}
                    className={`w-full rounded-md px-2.5 py-2 text-left transition-colors ${
                      selected?.id === resource.id
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="block truncate text-sm font-medium">
                      {resource.name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                      {resource.path}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {resource.record_count}{" "}
                      {resource.record_count === 1 ? "record" : "records"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto">
            {selected ? (
              <ResourceDetail
                resource={selected}
                onChanged={() => load()}
                onDelete={() => remove(selected)}
              />
            ) : null}
          </div>
        </div>
      )}

      <NewResourceDialog
        workspace={workspace}
        open={creating}
        onOpenChange={setCreating}
        onCreated={async (resource) => {
          await load(false);
          setSelected(resource);
        }}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading resources…
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium">Could not load resources</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <Boxes className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-base font-medium">No resources yet</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        A resource is a path like <code className="font-mono">/accounts</code>{" "}
        that answers every CRUD call against one shared store. Create one and
        you get list, read, create, update and delete straight away, with
        generated records to start from.
      </p>
      <Button className="mt-5" onClick={onCreate}>
        <Plus className="h-3.5 w-3.5" />
        Create your first resource
      </Button>
    </div>
  );
}

function ResourceDetail({
  resource,
  onChanged,
  onDelete,
}: {
  resource: Resource;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const [seeding, setSeeding] = useState(false);

  const seed = async (count: number) => {
    setSeeding(true);
    try {
      const res = await api.resources.seed(resource.id, count);
      toast.success(`Added ${res.created} records`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add records");
    } finally {
      setSeeding(false);
    }
  };

  const clear = async () => {
    if (!window.confirm(`Remove all ${resource.record_count} records?`)) return;
    try {
      await api.resources.clearRecords(resource.id);
      toast.success("Records cleared");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear records");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-medium">{resource.name}</h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {resource.deployed_url}
          </p>
          {resource.description ? (
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              {resource.description}
            </p>
          ) : null}
        </div>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </header>

      <section>
        <h3 className="text-xs font-medium text-muted-foreground">
          Operations
        </h3>
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
          {resource.operations.map((op) => (
            <li
              key={`${op.method} ${op.path}`}
              className="flex items-center gap-3 px-3 py-2"
            >
              <MethodBadge method={op.method} />
              <code className="min-w-0 flex-1 truncate font-mono text-xs">
                {op.path}
              </code>
              <span className="shrink-0 text-xs text-muted-foreground">
                {op.summary}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          The list route supports <code className="font-mono">?page</code>,{" "}
          <code className="font-mono">?limit</code>,{" "}
          <code className="font-mono">?sort</code>,{" "}
          <code className="font-mono">?q</code>, and any field name as a filter.
        </p>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            Records ({resource.record_count})
          </h3>
          <div className="flex gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={seeding}
              onClick={() => seed(10)}
            >
              {seeding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Database className="h-3 w-3" />
              )}
              Generate 10
            </Button>
            {resource.record_count > 0 ? (
              <Button size="xs" variant="ghost" onClick={clear}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
        <RecordsTable resource={resource} />
      </section>
    </div>
  );
}

