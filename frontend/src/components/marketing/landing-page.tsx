"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Boxes, Code2, Globe2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/nav";
import { BrandLogo } from "@/components/brand-logo";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const FEATURES = [
  {
    href: "/features/mock-apis",
    icon: Boxes,
    title: "Mock APIs",
    body: "Deploy production-shaped endpoints with auth, rules, and scenarios.",
  },
  {
    href: "/features/custom-domains",
    icon: Globe2,
    title: "Custom domains",
    body: "Serve partner traffic on your domain without workspace slugs.",
  },
  {
    href: "/features/openapi",
    icon: Code2,
    title: "Import & export",
    body: "Paste OpenAPI or Postman. Export collections the same way.",
  },
  {
    href: "/features/analytics",
    icon: Gauge,
    title: "Logs & analytics",
    body: "See every hit with latency, errors, and date filters.",
  },
];

export function LandingPage() {
  const reduce = useReducedMotion();
  const anim = reduce ? undefined : fadeUp;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-white/15">
      <MarketingNav />

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 65% 45% at 50% -8%, oklch(1 0 0 / 10%), transparent 55%)",
            }}
          />
          <motion.div
            className="relative mx-auto max-w-5xl px-4 pb-20 pt-24 sm:pt-32"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <motion.div variants={anim} className="flex items-center gap-3">
              <BrandLogo size={36} />
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                backendruntime
              </p>
            </motion.div>
            <motion.h1
              variants={anim}
              className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl sm:leading-[1.05]"
            >
              Enterprise Integration Sandbox
            </motion.h1>
            <motion.p
              variants={anim}
              className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Stand up production-shaped mock APIs, bind custom domains, and
              validate partner traffic before the real backend ships.
            </motion.p>
            <motion.div variants={anim} className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="h-11 px-5">
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="h-11 px-5">
                  Documentation
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={anim}
              className="mt-16 overflow-hidden rounded-xl border border-border/80 bg-[#0a0a0a]"
            >
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                  runtime · deployed
                </span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
                <code>
                  <span className="text-emerald-400/90">200</span>{" "}
                  <span className="text-foreground">POST</span>{" "}
                  https://sandbox.acme.com/aml/screen
                  {"\n"}
                  <span className="text-muted-foreground/50">  </span>
                  auth bearer · 42ms · X-API-Version:{" "}
                  <span className="text-foreground">v12</span>
                  {"\n\n"}
                  <span className="text-foreground">
                    {`{ "match": true, "score": 0.12, "caseId": "aml_9f2a" }`}
                  </span>
                </code>
              </pre>
            </motion.div>
          </motion.div>
        </section>

        <section className="border-b border-border px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <p id="product" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Product
            </p>
            <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything you need to mock integrations.
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="group block transition-colors"
                >
                  <f.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  <h3 className="mt-3 text-base font-medium tracking-tight">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ship the sandbox first.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Create a workspace, deploy an endpoint, share a URL. Partners can
              integrate today.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="h-11 px-6">
                  Create workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="h-11 px-6">
                  Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo size={24} showWordmark />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground">
              Docs
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
