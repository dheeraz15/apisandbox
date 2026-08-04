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
import { api, MockAPIListItem } from "@/lib/api";

const PAGES = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Endpoints", href: "/apis", icon: Globe },
  { label: "Collections", href: "/collections", icon: FolderOpen },
  { label: "Logs", href: "/logs", icon: ScrollText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Webhooks", href: "/webhooks", icon: Webhook },
  { label: "Datasets", href: "/datasets", icon: Database },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CommandPalette({ workspace }: { workspace: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const base = `/${workspace}`;
  const [open, setOpen] = useState(false);
  const [apis, setApis] = useState<MockAPIListItem[]>([]);

  const loadApis = useCallback(() => {
    api.apis.list(workspace).then((r) => setApis(r.results)).catch(() => {});
  }, [workspace]);

  useEffect(() => {
    loadApis();
  }, [loadApis]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        loadApis();
      }
    };
    const onOpen = () => {
      setOpen(true);
      loadApis();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, [loadApis]);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Pages and endpoints">
      <CommandInput placeholder="Search pages, endpoints…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go(`${base}/apis/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            New endpoint
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Pages">
          {PAGES.map(({ label, href, icon: Icon }) => {
            const path = href ? `${base}${href}` : base;
            return (
              <CommandItem key={href} onSelect={() => go(path)}>
                <Icon className="mr-2 h-4 w-4" />
                {label}
                {pathname === path && (
                  <span className="ml-auto text-xs text-muted-foreground">current</span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {apis.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Endpoints">
              {apis.slice(0, 20).map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => go(`${base}/apis/${item.id}`)}
                  value={`${item.name} ${item.endpoint}`}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  <span className="truncate">{item.name}</span>
                  <span className="ml-2 truncate font-mono text-xs text-muted-foreground">
                    {item.endpoint}
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
