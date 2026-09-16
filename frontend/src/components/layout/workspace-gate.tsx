"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ApiError, api, getAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

const RESERVED = new Set([
  "signup",
  "login",
  "onboarding",
  "docs",
  "platform",
  "api",
  "favicon.ico",
]);

/** How many times to retry when the server is unreachable or erroring. */
const MAX_RETRIES = 2;

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
  const [state, setState] = useState<
    "loading" | "ok" | "missing" | "unauthorized" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (RESERVED.has(workspace.toLowerCase())) {
      setState("missing");
      return;
    }
    if (!getAuthToken()) {
      router.replace(`/login?next=/${workspace}`);
      return;
    }

    let cancelled = false;

    /**
     * Only a real 404 means the workspace is missing. Treating every failure
     * as "not found" meant a workspace created moments earlier, or a backend
     * hiccup, showed a 404 page that a refresh then fixed.
     */
    const check = async (attempt = 0) => {
      try {
        await api.workspaces.get(workspace);
        if (!cancelled) setState("ok");
      } catch (e) {
        if (cancelled) return;

        const status = e instanceof ApiError ? e.status : -1;

        if (status === 404) {
          setState("missing");
          return;
        }
        if (status === 401 || status === 403) {
          setState("unauthorized");
          return;
        }

        const transient = e instanceof ApiError ? e.isTransient : true;
        if (transient && attempt < MAX_RETRIES) {
          window.setTimeout(() => check(attempt + 1), 400 * (attempt + 1));
          return;
        }

        setErrorMessage(e instanceof Error ? e.message : "Something went wrong");
        setState("error");
      }
    };

    setState("loading");
    check();

    return () => {
      cancelled = true;
    };
  }, [workspace, router, reloadKey]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading workspace…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="flex h-14 items-center px-6">
          <Link href="/">
            <BrandLogo size={28} showWordmark />
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 pb-24">
          <h1 className="text-3xl font-semibold tracking-tight">
            Could not load this workspace
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {errorMessage}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => setReloadKey((k) => k + 1)}>Try again</Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Home
            </Button>
          </div>
        </main>
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
