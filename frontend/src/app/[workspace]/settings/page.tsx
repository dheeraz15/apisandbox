import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { SettingsPage } from "@/components/settings/settings-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <WorkspaceLayout workspace={workspace}>
      <SettingsPage workspace={workspace} />
    </WorkspaceLayout>
  );
}
