import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { APIsPage } from "@/components/apis/apis-page";

export default async function APIsRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <APIsPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
