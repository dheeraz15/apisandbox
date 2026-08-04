import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <PlaceholderPage
        workspace={workspace}
        title="Deployments"
        description="Manage deployed API endpoints"
      />
    </WorkspaceLayout>
  );
}
