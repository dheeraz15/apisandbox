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
      <CollectionsPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
