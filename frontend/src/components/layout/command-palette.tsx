"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  FolderOpen,
  ScrollText,
  BarChart3,
  Settings,
  Plus,
  Webhook,
  Database,
  Variable,
  FileSearch,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { api, Collection, MockAPIListItem } from "@/lib/api";

const PAGES = [
  { label: "Overview", href: "", icon: LayoutDashboard, keywords: "home dashboard" },
  { label: "Endpoints", href: "/apis", icon: Globe, keywords: "apis mocks" },
  { label: "Collections", href: "/collections", icon: FolderOpen, keywords: "groups" },
  { label: "Logs", href: "/logs", icon: ScrollText, keywords: "traffic inspector" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, keywords: "metrics" },
  { label: "Webhooks", href: "/webhooks", icon: Webhook, keywords: "callbacks inbox" },
  { label: "Datasets", href: "/datasets", icon: Database, keywords: "faker data" },
  { label: "Variables", href: "/variables", icon: Variable, keywords: "env secrets" },
  { label: "Settings", href: "/settings", icon: Settings, keywords: "domains team" },
];

export function CommandPalette({ workspace }: { workspace: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const base = `/${workspace}`;
  const [open, setOpen] = useState(false);
  const [apis, setApis] = useState<MockAPIListItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  const load = useCallback(() => {
    api.apis.list(workspace).then((r) => setApis(r.results)).catch(() => {});
    api.collections.list(workspace).then(setCollections).catch(() => {});
  }, [workspace]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        load();
      }
    };
    const onOpen = () => {
      setOpen(true);
      load();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, [load]);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Pages, collections, and endpoints"
    >
      <CommandInput placeholder="Search pages, collections, endpoints…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            value="new endpoint create api"
            onSelect={() => go(`${base}/apis/new`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New endpoint
          </CommandItem>
          <CommandItem
            value="import postman openapi curl"
            onSelect={() => go(`${base}/collections`)}
          >
            <FileSearch className="mr-2 h-4 w-4" />
            Import Postman / OpenAPI
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Pages">
          {PAGES.map(({ label, href, icon: Icon, keywords }) => {
            const path = href ? `${base}${href}` : base;
            return (
              <CommandItem
                key={href || "overview"}
                value={`${label} ${keywords}`}
                onSelect={() => go(path)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
                {pathname === path && (
                  <span className="ml-auto text-xs text-muted-foreground">current</span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {collections.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Collections">
              {collections.slice(0, 12).map((c) => (
                <CommandItem
                  key={c.id}
                  value={`collection ${c.name} ${c.description || ""}`}
                  onSelect={() => go(`${base}/collections?c=${c.id}`)}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {c.api_count}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {apis.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Endpoints">
              {apis.slice(0, 25).map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => go(`${base}/apis/${item.id}`)}
                  value={`${item.name} ${item.method} ${item.endpoint} ${item.collection_name || ""}`}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  <span className="truncate">{item.name}</span>
                  <span className="ml-2 truncate font-mono text-xs text-muted-foreground">
                    {item.method} {item.endpoint}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
