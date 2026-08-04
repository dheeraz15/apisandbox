import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { VariablesPage } from "@/components/variables/variables-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <VariablesPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
