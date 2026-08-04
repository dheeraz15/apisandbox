"use client";

import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Toaster } from "@/components/ui/sonner";

export function WorkspaceLayout({
  workspace,
  children,
}: {
  workspace: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell workspace={workspace}>
      <AuthGuard>{children}</AuthGuard>
      <Toaster richColors position="bottom-right" />
    </AppShell>
  );
}
