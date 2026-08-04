"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  FolderOpen,
  Database,
  Variable,
  GitBranch,
  Rocket,
  ScrollText,
  Settings,
  Zap,
  Webhook,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/apis", label: "APIs", icon: Globe },
  { href: "/collections", label: "Collections", icon: FolderOpen },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/variables", label: "Variables", icon: Variable },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/scenarios", label: "Scenarios", icon: GitBranch },
  { href: "/deployments", label: "Deployments", icon: Rocket },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  workspace: string;
}

export function Sidebar({ workspace }: SidebarProps) {
  const pathname = usePathname();
  const base = `/${workspace}`;

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-none tracking-tight">
            ThirdFactor
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            API Sandbox · {workspace}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const fullHref = href ? `${base}${href}` : base;
          const isActive =
            href === ""
              ? pathname === base || pathname === `${base}/`
              : pathname.startsWith(fullHref);

          return (
            <Link
              key={href}
              href={fullHref}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Sandbox URL
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-foreground">
            /api/{workspace}
          </p>
        </div>
      </div>
    </aside>
  );
}
