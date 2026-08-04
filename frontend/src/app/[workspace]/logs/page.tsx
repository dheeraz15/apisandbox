import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { LogsPage } from "@/components/logs/logs-page";

export default async function LogsRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <LogsPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
