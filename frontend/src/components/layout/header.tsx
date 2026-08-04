"use client";

import { Search, Plus, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeaderProps {
  workspace: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ workspace, title, description, action }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </Button>
        {action || (
          <Link href={`/${workspace}/apis/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New API
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
