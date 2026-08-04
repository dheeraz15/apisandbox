import { Suspense } from "react";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export default async function WorkspaceDashboard({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
        <DashboardPage workspace={workspace} />
      </Suspense>
    </WorkspaceLayout>
  );
}
