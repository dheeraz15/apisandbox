"use client";

import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/layout/auth-guard";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { Toaster } from "@/components/ui/sonner";

export function WorkspaceLayout({
  workspace,
  children,
}: {
  workspace: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceGate workspace={workspace}>
      <AppShell workspace={workspace}>
        <AuthGuard>{children}</AuthGuard>
        <Toaster richColors position="bottom-right" />
      </AppShell>
    </WorkspaceGate>
  );
}
