import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { AnalyticsPage } from "@/components/analytics/analytics-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <AnalyticsPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
