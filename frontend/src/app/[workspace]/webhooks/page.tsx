import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { WebhooksPage } from "@/components/webhooks/webhooks-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <WebhooksPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
