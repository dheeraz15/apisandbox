"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeaderProps {
  workspace: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Page title bar — search lives in AppShell (⌘K). Do not add another Search here. */
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
        {action || (
          <Link href={`/${workspace}/apis/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New endpoint
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
