import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { ResourcesPage } from "@/components/resources/resources-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <ResourcesPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
