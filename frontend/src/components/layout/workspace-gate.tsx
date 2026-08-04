"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api, getAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

const RESERVED = new Set([
  "signup",
  "login",
  "onboarding",
  "docs",
  "pricing",
  "terms",
  "privacy",
  "features",
  "platform",
  "api",
  "llms.txt",
  "favicon.ico",
]);

/**
 * Validates workspace slug. Renders a proper 404 instead of DRF error text.
 */
export function WorkspaceGate({
  workspace,
  children,
}: {
  workspace: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "missing" | "unauthorized">(
    "loading"
  );

  useEffect(() => {
    if (RESERVED.has(workspace.toLowerCase())) {
      setState("missing");
      return;
    }
    if (!getAuthToken()) {
      router.replace(`/login?next=/${workspace}`);
      return;
    }
    api.workspaces
      .get(workspace)
      .then(() => setState("ok"))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "";
        if (/no workspace matches|not found|404/i.test(msg)) {
          setState("missing");
        } else if (/unauthorized|401|403|credentials/i.test(msg)) {
          setState("unauthorized");
        } else {
          // Still treat unknown as missing for cleaner UX
          setState("missing");
        }
      });
  }, [workspace, router]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading workspace…
      </div>
    );
  }

  if (state === "missing" || state === "unauthorized") {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="flex h-14 items-center px-6">
          <Link href="/">
            <BrandLogo size={28} showWordmark />
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 pb-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            404
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Workspace not found
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              /{workspace}
            </code>{" "}
            is not a workspace you can open. It may have been deleted, mistyped, or
            belong to another account.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => router.push("/onboarding")}>
              Create workspace
            </Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
