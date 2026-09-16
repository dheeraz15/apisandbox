"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Plus, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  REPEAT_RANGE_SNIPPET,
  REPEAT_SNIPPET,
  TEMPLATE_GROUPS,
} from "@/lib/template-variables";

type Props = {
  /**
   * Adds a generated list to the response body. When absent the snippet is
   * only copied, and the button says so.
   */
  onUseSnippet?: (snippet: string) => void;
};

/**
 * Searchable reference for the template vocabulary.
 *
 * Without this the only way to discover {{randomFrom:...}} or a $repeat block
 * is to read the docs, which nobody does while mid-edit.
 */
export function TemplatePalette({ onUseSnippet }: Props) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TEMPLATE_GROUPS;
    return TEMPLATE_GROUPS.map((group) => ({
      ...group,
      variables: group.variables.filter(
        (v) =>
          v.token.toLowerCase().includes(q) ||
          v.label.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q)
      ),
    })).filter((group) => group.variables.length > 0);
  }, [query]);

  const flash = (value: string) => {
    setCopied(value);
    window.setTimeout(() => setCopied((c) => (c === value ? null : c)), 1400);
  };

  const copyToken = (token: string) => {
    navigator.clipboard?.writeText(token).catch(() => {});
    flash(token);
  };

  const useSnippet = (snippet: string) => {
    if (onUseSnippet) {
      onUseSnippet(snippet);
    } else {
      navigator.clipboard?.writeText(snippet).catch(() => {});
    }
    flash(snippet);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search variables"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <section>
          <h4 className="text-xs font-medium">Generate a list</h4>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Replace any value with this to get a generated array instead of a
            single item.
          </p>
          <div className="mt-2 space-y-1.5">
            <SnippetRow
              label="Fixed length"
              snippet={REPEAT_SNIPPET}
              copied={copied}
              inserts={Boolean(onUseSnippet)}
              onUse={useSnippet}
            />
            <SnippetRow
              label="Random length"
              snippet={REPEAT_RANGE_SNIPPET}
              copied={copied}
              inserts={Boolean(onUseSnippet)}
              onUse={useSnippet}
            />
          </div>
        </section>

        {groups.map((group) => (
          <section key={group.name}>
            <h4 className="text-xs font-medium">{group.name}</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {group.blurb}
            </p>
            <ul className="mt-2 space-y-1">
              {group.variables.map((v) => (
                <li key={v.token}>
                  <button
                    type="button"
                    onClick={() => copyToken(v.token)}
                    title={v.description}
                    className="group w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-[11px] text-foreground">
                        {v.token}
                      </code>
                      {copied === v.token ? (
                        <Check className="h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <Copy className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {v.description}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                      {v.example}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nothing matches “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}

function SnippetRow({
  label,
  snippet,
  copied,
  inserts,
  onUse,
}: {
  label: string;
  snippet: string;
  copied: string | null;
  inserts: boolean;
  onUse: (s: string) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium">{label}</span>
        <Button
          size="xs"
          variant="ghost"
          className="h-6 text-[11px]"
          onClick={() => onUse(snippet)}
        >
          {copied === snippet ? (
            <>
              <Check className="h-3 w-3" /> {inserts ? "Added" : "Copied"}
            </>
          ) : (
            <>
              {inserts ? <Plus className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {inserts ? "Add to response" : "Copy"}
            </>
          )}
        </Button>
      </div>
      <pre className="mt-1 max-h-28 overflow-auto font-mono text-[10px] leading-relaxed text-muted-foreground">
        {snippet}
      </pre>
    </div>
  );
}
