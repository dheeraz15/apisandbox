"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GitBranch, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MethodBadge } from "@/components/apis/method-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ApiError, MockAPI } from "@/lib/api";

/**
 * Scenarios switch what an endpoint returns without editing it.
 *
 * They already existed per endpoint but there was no screen for them, so the
 * only way to flip one was to open the endpoint and edit it. This lists every
 * endpoint that defines scenarios and lets you switch them from one place,
 * including switching a shared scenario name across the whole workspace.
 */
export function ScenariosPage({ workspace }: { workspace: string }) {
  const [apis, setApis] = useState<MockAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const list = await api.apis.list(workspace);
      const detailed = await Promise.all(
        list.results.map((item) => api.apis.get(item.id).catch(() => null))
      );
      setApis(detailed.filter((a): a is MockAPI => Boolean(a)));
    } catch (e) {
      setError(
        e instanceof ApiError && e.isTransient
          ? "Could not reach the API. Is the backend running?"
          : e instanceof Error
            ? e.message
            : "Could not load scenarios"
      );
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    load();
  }, [load]);

  const withScenarios = useMemo(
    () => apis.filter((a) => (a.scenarios || []).length > 0),
    [apis]
  );

  /** Scenario names that more than one endpoint defines, so they can move together. */
  const sharedNames = useMemo(() => {
    const counts = new Map<string, number>();
    withScenarios.forEach((a) =>
      (a.scenarios || []).forEach((s) =>
        counts.set(s.name, (counts.get(s.name) || 0) + 1)
      )
    );
    return [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(([name]) => name)
      .sort();
  }, [withScenarios]);

  const setScenario = async (target: MockAPI, name: string) => {
    setBusy(target.id);
    try {
      await api.apis.update(target.id, { active_scenario: name });
      setApis((current) =>
        current.map((a) =>
          a.id === target.id ? { ...a, active_scenario: name } : a
        )
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not switch scenario");
    } finally {
      setBusy(null);
    }
  };

  const setEverywhere = async (name: string) => {
    const targets = withScenarios.filter((a) =>
      (a.scenarios || []).some((s) => s.name === name)
    );
    setBusy("all");
    try {
      await Promise.all(
        targets.map((a) => api.apis.update(a.id, { active_scenario: name }))
      );
      setApis((current) =>
        current.map((a) =>
          targets.some((t) => t.id === a.id)
            ? { ...a, active_scenario: name }
            : a
        )
      );
      toast.success(`${targets.length} endpoints switched to "${name}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not switch scenarios");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Scenarios"
        description="Switch what endpoints return without editing them"
      />

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading scenarios…
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium">Could not load scenarios</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={load}>
            Try again
          </Button>
        </div>
      ) : withScenarios.length === 0 ? (
        <EmptyState workspace={workspace} />
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {sharedNames.length > 0 ? (
            <section className="mb-6 rounded-lg border border-border p-4">
              <h2 className="text-sm font-medium">Switch everything at once</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                These scenario names are defined on more than one endpoint, so
                the whole workspace can move together.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sharedNames.map((name) => (
                  <Button
                    key={name}
                    size="xs"
                    variant="outline"
                    disabled={busy === "all"}
                    onClick={() => setEverywhere(name)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}

          <ul className="space-y-3">
            {withScenarios.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <MethodBadge method={item.method} className="mt-px shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${workspace}/apis/${item.id}`}
                      className="truncate text-sm font-medium leading-5 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {item.endpoint}
                    </p>
                  </div>
                  {busy === item.id ? (
                    <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(item.scenarios || []).map((scenario) => {
                    const active =
                      (item.active_scenario || "default") === scenario.name;
                    return (
                      <Button
                        key={scenario.name}
                        size="xs"
                        variant={active ? "secondary" : "outline"}
                        disabled={busy === item.id}
                        onClick={() => setScenario(item, scenario.name)}
                        title={
                          active
                            ? "Currently serving this scenario"
                            : `Switch to ${scenario.name}`
                        }
                      >
                        {scenario.label || scenario.name}
                      </Button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmptyState({ workspace }: { workspace: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <GitBranch className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-base font-medium">No scenarios yet</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        A scenario is a named alternative response set on an endpoint, so you
        can flip it into &ldquo;account not found&rdquo; or &ldquo;provider
        down&rdquo; without editing anything. Add scenarios to an endpoint and
        they show up here, ready to switch.
      </p>
      <Link href={`/${workspace}/apis`} className={`mt-5 ${buttonVariants()}`}>
        Go to endpoints
      </Link>
    </div>
  );
}
