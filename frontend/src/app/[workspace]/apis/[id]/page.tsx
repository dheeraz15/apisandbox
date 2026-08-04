import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { APIEditorPage } from "@/components/apis/api-editor-page";

export default async function APIEditorRoute({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <APIEditorPage workspace={workspace} apiId={id} />
    </WorkspaceLayout>
  );
}
