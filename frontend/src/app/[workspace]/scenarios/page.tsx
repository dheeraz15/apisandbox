import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { ScenariosPage } from "@/components/scenarios/scenarios-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <ScenariosPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
