"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { api, Resource, ResourceRecord } from "@/lib/api";

/** Flat table of a resource's records, columns inferred from the data. */
export function RecordsTable({ resource }: { resource: Resource }) {
  const [records, setRecords] = useState<ResourceRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setRecords(null);
    setError("");

    api.resources
      .records(resource.id)
      .then((rows) => {
        if (!cancelled) setRecords(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load records");
        }
      });

    return () => {
      cancelled = true;
    };
    // record_count changes when records are seeded or cleared, which is the
    // signal to reload.
  }, [resource.id, resource.record_count]);

  if (error) {
    return (
      <p className="mt-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-red-400">
        {error}
      </p>
    );
  }

  if (records === null) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border p-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading records…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        No records yet. Generate some, or POST to{" "}
        <code className="font-mono">{resource.path}</code> and they will appear
        here.
      </p>
    );
  }

  const columns = Array.from(
    records.reduce<Set<string>>((keys, row) => {
      Object.keys(row.data || {}).forEach((k) => keys.add(k));
      return keys;
    }, new Set())
  ).slice(0, 8);

  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-max text-left text-xs">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.slice(0, 50).map((row) => (
            <tr key={row.id} className="hover:bg-muted/20">
              {columns.map((col) => (
                <td
                  key={col}
                  className="max-w-[260px] truncate px-3 py-2 font-mono text-[11px]"
                  title={format(row.data?.[col])}
                >
                  {format(row.data?.[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {records.length > 50 ? (
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          Showing the first 50 of {records.length}.
        </p>
      ) : null}
    </div>
  );
}

function format(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
