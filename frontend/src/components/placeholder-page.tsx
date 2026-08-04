"use client";

import { Header } from "@/components/layout/header";

export function PlaceholderPage({
  workspace,
  title,
  description,
}: {
  workspace: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <Header workspace={workspace} title={title} description={description} />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Coming soon</p>
      </div>
    </>
  );
}
