import { Suspense } from "react";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { APIBuilderPage } from "@/components/apis/api-builder-page";

export default async function NewAPIRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
        <APIBuilderPage workspace={workspace} />
      </Suspense>
    </WorkspaceLayout>
  );
}
