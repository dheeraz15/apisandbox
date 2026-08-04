import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { DatasetsPage } from "@/components/datasets/datasets-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <DatasetsPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
