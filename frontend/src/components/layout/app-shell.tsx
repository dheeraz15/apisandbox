"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Globe,
  FolderOpen,
  Database,
  Variable,
  Webhook,
  ScrollText,
  BarChart3,
  Settings,
  Plus,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, AuthUser, setAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "@/components/layout/command-palette";
import { BrandLogo } from "@/components/brand-logo";
import { Search } from "lucide-react";

const NAV = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/apis", label: "Endpoints", icon: Globe },
  { href: "/collections", label: "Collections", icon: FolderOpen },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/variables", label: "Variables", icon: Variable },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  workspace,
  children,
}: {
  workspace: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${workspace}`;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => setUser(null));
    api.workspaces.list().then(setWorkspaces).catch(() => {});
  }, []);

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore */
    }
    setAuthToken(null);
    router.push("/login");
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar — Vercel-style */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <BrandLogo size={20} showWordmark />
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-accent transition-colors">
              {workspace}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {workspaces.map((ws) => (
                <DropdownMenuItem key={ws.slug} onClick={() => router.push(`/${ws.slug}`)}>
                  {ws.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => router.push("/onboarding")}>
                + New workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            className="hidden sm:flex h-7 items-center gap-2 rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            Search
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
          <Link href={`/${workspace}/apis/new`}>
            <Button size="sm" className="h-7 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New endpoint
            </Button>
          </Link>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {(user.name || user.email)[0]?.toUpperCase()}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="flex w-48 shrink-0 flex-col border-r border-border py-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const full = href ? `${base}${href}` : base;
            const active =
              href === ""
                ? pathname === base || pathname === `${base}/`
                : pathname.startsWith(full);
            return (
              <Link
                key={href}
                href={full}
                className={cn(
                  "mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <CommandPalette workspace={workspace} />
    </div>
  );
}
