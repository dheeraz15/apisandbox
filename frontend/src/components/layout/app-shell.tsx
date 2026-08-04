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
  Search,
  Upload,
  Download,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, AuthUser, setAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "@/components/layout/command-palette";
import { BrandLogo } from "@/components/brand-logo";
import {
  AppViewMode,
  getViewMode,
  lastWorkspace,
  rememberWorkspace,
  setViewMode,
} from "@/lib/view-mode";

type NavItem = { href: string; label: string; icon: typeof Globe };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Observe",
    items: [
      { href: "", label: "Overview", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/logs", label: "Logs", icon: ScrollText },
    ],
  },
  {
    label: "API",
    items: [
      { href: "/apis", label: "Endpoints", icon: Globe },
      { href: "/collections", label: "Collections", icon: FolderOpen },
      { href: "/apis/new?import=1", label: "Import", icon: Upload },
      { href: "/collections?export=1", label: "Export", icon: Download },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/datasets", label: "Datasets", icon: Database },
      { href: "/variables", label: "Variables", icon: Variable },
      { href: "/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/settings#domains", label: "Domains", icon: Globe },
    ],
  },
  {
    label: "Workspace",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
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
  const [mode, setMode] = useState<AppViewMode>("user");

  useEffect(() => {
    setMode(getViewMode());
    rememberWorkspace(workspace);
    api.auth.me().then(setUser).catch(() => setUser(null));
    api.workspaces.list().then(setWorkspaces).catch(() => {});
    const onMode = (e: Event) => {
      const detail = (e as CustomEvent<AppViewMode>).detail;
      if (detail) setMode(detail);
    };
    window.addEventListener("br-view-mode", onMode);
    return () => window.removeEventListener("br-view-mode", onMode);
  }, [workspace]);

  const isStaff = Boolean(user?.is_staff || user?.is_superuser);

  const switchMode = (next: AppViewMode) => {
    setViewMode(next);
    setMode(next);
    if (next === "platform") {
      router.push("/platform");
      return;
    }
    const slug = lastWorkspace() || workspace || workspaces[0]?.slug;
    if (slug) router.push(`/${slug}`);
    else router.push("/onboarding");
  };

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
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <BrandLogo size={28} showWordmark />
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
          {isStaff && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent transition-colors">
                  {mode === "platform" ? (
                    <Shield className="h-3 w-3" />
                  ) : null}
                  {mode === "platform" ? "Platform view" : "User view"}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => switchMode("user")}>
                    User view
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      Your workspaces
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => switchMode("platform")}>
                    Platform view
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      All tenants
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
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
                {isStaff && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => switchMode("platform")}>
                      <Shield className="mr-2 h-3.5 w-3.5" />
                      Platform admin
                    </DropdownMenuItem>
                  </>
                )}
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
        <nav className="flex w-52 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const pathOnly = href.split("?")[0].split("#")[0];
                  const full = pathOnly ? `${base}${pathOnly}` : base;
                  const active =
                    pathOnly === ""
                      ? pathname === base || pathname === `${base}/`
                      : pathname === full || pathname.startsWith(`${full}/`);
                  return (
                    <Link
                      key={href}
                      href={pathOnly ? `${base}${href}` : base}
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
              </div>
            </div>
          ))}
        </nav>
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <CommandPalette workspace={workspace} />
    </div>
  );
}
