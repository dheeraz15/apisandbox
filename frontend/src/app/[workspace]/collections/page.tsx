import { Suspense } from "react";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { CollectionsPage } from "@/components/collections/collections-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <Suspense
        fallback={<div className="p-6 text-sm text-muted-foreground">Loading collections…</div>}
      >
        <CollectionsPage workspace={workspace} />
      </Suspense>
    </WorkspaceLayout>
  );
}
