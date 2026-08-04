"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, ScrollText, FolderOpen, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlatformMockBase } from "@/lib/api";

const WIZARD_KEY = (ws: string) => `br_wizard_${ws}`;

export function isWizardDone(workspace: string) {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WIZARD_KEY(workspace)) === "done";
}

export function markWizardDone(workspace: string) {
  localStorage.setItem(WIZARD_KEY(workspace), "done");
}

export function GettingStarted({
  workspace,
  hasEndpoints,
  hasRequests,
  onDismiss,
}: {
  workspace: string;
  hasEndpoints: boolean;
  hasRequests: boolean;
  onDismiss?: () => void;
}) {
  const cards = [
    {
      done: hasEndpoints,
      icon: Zap,
      title: "Create your first endpoint",
      desc: "Use a template or describe any API in plain English.",
      href: `/${workspace}/apis/new`,
      cta: "New endpoint",
    },
    {
      done: hasEndpoints,
      icon: Globe,
      title: "Deploy & get your URL",
      desc: "Hit your mock API from curl, Postman, or your app.",
      href: `/${workspace}/apis`,
      cta: "View endpoints",
    },
    {
      done: hasRequests,
      icon: ScrollText,
      title: "See request logs",
      desc: "Every hit logged with body, status, latency, and rules matched.",
      href: `/${workspace}/logs`,
      cta: "Open logs",
    },
    {
      done: false,
      icon: FolderOpen,
      title: "Organize with collections",
      desc: "Group endpoints by product or team.",
      href: `/${workspace}/collections`,
      cta: "Collections",
    },
  ];

  const doneCount = cards.filter((c) => c.done).length;
  if (doneCount >= 3 && onDismiss) return null;

  return (
    <section className="border-b border-border px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Getting started</h2>
          <p className="text-xs text-muted-foreground">
            {doneCount}/{cards.length} complete — ship your first mock API in minutes
          </p>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ done, icon: Icon, title, desc, href, cta }) => (
          <Link
            key={title}
            href={href}
            className={`group rounded-lg border p-4 transition-colors hover:bg-accent/30 ${
              done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon className={`h-4 w-4 ${done ? "text-emerald-400" : "text-muted-foreground"}`} />
              {done && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                  Done
                </span>
              )}
            </div>
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</p>
            <span className="mt-3 inline-flex items-center text-xs text-muted-foreground group-hover:text-foreground">
              {cta} <ArrowRight className="ml-1 h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function WelcomeWizard({
  workspace,
  open,
  onClose,
}: {
  workspace: string;
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const finish = () => {
    markWizardDone(workspace);
    onClose();
  };

  const steps = [
    {
      title: "Welcome to backendruntime",
      body: "Enterprise infrastructure for reliable pre-backend mocking — validate contracts, build mocks, and inspect traffic.",
    },
    {
      title: "Your API base URL",
      body: `Deployed endpoints live at:\n${getPlatformMockBase(workspace)}/your-path\nShare with QA, partners, or wire into tests.`,
    },
    {
      title: "Quick start",
      body: "1. Create an endpoint (template, import, or describe it)\n2. Deploy\n3. Hit it from curl or your app\n4. Watch logs in real time",
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-1 flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-foreground" : "bg-muted"}`}
            />
          ))}
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">{current.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {current.body}
        </p>
        <div className="mt-6 flex gap-2">
          {step < steps.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Link href={`/${workspace}/apis/new`} className="flex-1">
              <Button className="w-full" onClick={finish}>
                Create first endpoint
              </Button>
            </Link>
          )}
          <Button variant="outline" onClick={finish}>
            {step < steps.length - 1 ? "Skip" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  );
}
