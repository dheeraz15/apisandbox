import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { DeploymentsPage } from "@/components/deployments/deployments-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <DeploymentsPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
