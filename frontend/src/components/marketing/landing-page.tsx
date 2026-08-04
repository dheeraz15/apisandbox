"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  Code2,
  Fingerprint,
  Gauge,
  Globe2,
  Layers,
  Lock,
  Radio,
  ScrollText,
  Shield,
  Webhook,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/nav";
import { AnnouncementBar } from "@/components/marketing/announcement-bar";
import { BrandLogo } from "@/components/brand-logo";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export function LandingPage() {
  const reduce = useReducedMotion();
  const anim = reduce ? undefined : fadeUp;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-white/20">
      <AnnouncementBar />
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% -10%, oklch(1 0 0 / 12%), transparent 60%), radial-gradient(ellipse 40% 30% at 80% 20%, oklch(1 0 0 / 6%), transparent 50%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.28]"
            style={{
              backgroundImage:
                "linear-gradient(to right, oklch(1 0 0 / 5%) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 5%) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
              maskImage:
                "radial-gradient(ellipse 85% 55% at 50% 0%, black 15%, transparent 75%)",
            }}
          />
          <motion.div
            className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 sm:pt-28"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <motion.div variants={anim} className="flex items-center gap-3">
              <BrandLogo size={40} />
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                backendruntime
              </p>
            </motion.div>
            <motion.h1
              variants={anim}
              className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl sm:leading-[1.02] lg:text-7xl"
            >
              Enterprise Integration Sandbox
            </motion.h1>
            <motion.p
              variants={anim}
              className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Stand up production-shaped mock APIs, bind custom domains, and
              validate partner traffic before the real backend exists.
            </motion.p>
            <motion.div variants={anim} className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="h-11 px-5 transition-transform hover:-translate-y-0.5">
                  Create workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="h-11 px-5">
                  Read the docs
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={anim}
              className="mt-16 overflow-hidden rounded-xl border border-border/80 bg-[#090909]/80 shadow-[0_0_0_1px_oklch(1_0_0_/4%)] backdrop-blur-sm transition-shadow hover:shadow-[0_24px_80px_-40px_oklch(1_0_0_/25%)]"
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
                  <span className="text-muted-foreground/45">  </span>
                  auth bearer · rule{" "}
                  <span className="text-foreground">amount &gt; 0</span> ·{" "}
                  <span className="text-foreground">42ms</span>
                  {"\n"}
                  <span className="text-muted-foreground/45">  </span>
                  X-API-Version:{" "}
                  <span className="text-foreground">v12</span>
                  {"  "}
                  <span className="text-muted-foreground/45">
                    (revision only — URL unchanged)
                  </span>
                  {"\n\n"}
                  <span className="text-foreground">
                    {`{ "match": true, "score": 0.12, "caseId": "aml_9f2a" }`}
                  </span>
                </code>
              </pre>
            </motion.div>
          </motion.div>
        </section>

        {/* Trusted by */}
        <Section>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Trusted by integration teams
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground/70">
            {["Acme Bank", "Northwind Pay", "Helix KYC", "Orbit Ledger", "Summit Core"].map(
              (name) => (
                <span key={name} className="font-medium tracking-tight">
                  {name}
                </span>
              )
            )}
          </div>
        </Section>

        {/* Problem */}
        <Section bordered>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Real backends arrive late. Integrations cannot wait.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Partner UAT, mobile clients, and QA pipelines stall when contracts
              are unfinished. Static JSON files drift. Shared Postman mocks are
              not an environment.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            {[
              {
                title: "Contract drift",
                body: "Specs change; mocks do not. Failures show up in production, not in sandbox.",
              },
              {
                title: "No durable URL",
                body: "Local tunnels and personal machines do not scale to partners and CI.",
              },
              {
                title: "Blind traffic",
                body: "Without logs, rules, and scenarios, you cannot reproduce what clients send.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-background p-8 transition-colors hover:bg-accent/20">
                <h3 className="text-base font-medium tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Product features */}
        <Section id="product" bordered>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Product</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything an integration sandbox needs
            </h2>
          </div>
          <div className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="group rounded-xl border border-border bg-card/40 p-6 transition-all hover:-translate-y-1 hover:border-foreground/20 hover:bg-accent/30"
              >
                <f.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                <h3 className="mt-4 text-base font-medium tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                  Learn more <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </Section>

        {/* Interactive preview */}
        <Section bordered>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Preview</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              From definition to live path
            </h2>
          </div>
          <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-xl border border-border">
            <div className="grid lg:grid-cols-2">
              <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Builder
                </p>
                <div className="mt-4 space-y-3 font-mono text-xs">
                  <Row k="method" v="POST" />
                  <Row k="path" v="/payments/authorize" />
                  <Row k="auth" v="bearer" />
                  <Row k="scenario" v="approved" />
                  <Row k="domain" v="sandbox.acme.com" />
                </div>
              </div>
              <div className="bg-[#080808] p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Response
                </p>
                <pre className="mt-4 overflow-x-auto font-mono text-[12px] leading-relaxed text-muted-foreground">
                  <code className="text-foreground">{`{
  "paymentId": "pay_8f2a",
  "status": "authorized",
  "authCode": "A91X"
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </Section>

        {/* Templates */}
        <Section bordered>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Templates</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Start from a known contract
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "OpenAPI import",
              "Postman collection",
              "KYC / AML screen",
              "Payments authorize",
              "Webhook receiver",
              "Account verify",
              "curl paste",
              "Blank endpoint",
            ].map((t) => (
              <div
                key={t}
                className="rounded-lg border border-border px-4 py-4 text-sm transition-all hover:-translate-y-0.5 hover:border-foreground/25"
              >
                <Code2 className="mb-3 h-4 w-4 text-muted-foreground" />
                {t}
              </div>
            ))}
          </div>
        </Section>

        {/* Enterprise */}
        <Section bordered>
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Eyebrow>Enterprise</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Built for regulated integrations
              </h2>
              <p className="mt-4 text-muted-foreground">
                Roles, custom domains, request tracing, and revision history —
                without changing the path partners already call.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "Workspace roles: owner, manager, editor, viewer",
                  "Verified custom domains with DNS checks",
                  "Auto-bumped revisions on every save",
                  "Request IDs, trace IDs, and latency logs",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-gradient-to-br from-white/[0.06] to-transparent p-8">
              <div className="space-y-4">
                {[
                  { icon: Lock, label: "Auth modes", value: "Bearer · API key · Basic" },
                  { icon: Gauge, label: "Rate limits", value: "Per endpoint" },
                  { icon: ScrollText, label: "Audit trail", value: "Full request logs" },
                  { icon: Fingerprint, label: "Observability", value: "OTel-style IDs" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 px-4 py-3 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <row.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{row.label}</span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Why */}
        <Section bordered>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Why backendruntime</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Infrastructure for the waiting room of APIs
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Not a toy mock server. A durable environment for validators,
              partner sandboxes, and pre-production traffic.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Minutes to first hit",
                body: "Import a spec or describe an endpoint. Deploy a stable URL immediately.",
              },
              {
                icon: Layers,
                title: "Rules that behave",
                body: "Branch responses by body, header, or query. Switch scenarios without redeploying.",
              },
              {
                icon: Radio,
                title: "Traffic you can trust",
                body: "Inspect every call. Measure latency. Catch schema and auth failures early.",
              },
            ].map((item) => (
              <div key={item.title} className="text-center sm:text-left">
                <item.icon className="mx-auto h-5 w-5 text-muted-foreground sm:mx-0" />
                <h3 className="mt-4 text-base font-medium tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Testimonials */}
        <Section bordered>
          <Eyebrow className="text-center">Testimonials</Eyebrow>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight">
            What teams will say
          </h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
            {[
              {
                quote:
                  "We gave partners a domain in a day. The real core banking cutover took six months.",
                who: "Integration lead · Fintech",
              },
              {
                quote:
                  "Scenarios replaced our spreadsheet of sample responses. QA stopped guessing.",
                who: "QA manager · Payments",
              },
              {
                quote:
                  "Logs with request IDs meant we could debug partner clients without SSH.",
                who: "Platform engineer · Banking",
              },
            ].map((t) => (
              <blockquote
                key={t.who}
                className="rounded-xl border border-border p-6 text-sm leading-relaxed text-muted-foreground"
              >
                <p className="text-foreground">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 font-mono text-[11px] text-muted-foreground">
                  {t.who}
                </footer>
              </blockquote>
            ))}
          </div>
        </Section>

        {/* Pricing */}
        <Section id="pricing" bordered>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Simple packaging</h2>
            <p className="mt-3 text-muted-foreground">
              Free while we finalize plans. Enterprise seats and SLAs coming soon.
            </p>
            <div className="mx-auto mt-10 max-w-md rounded-xl border border-border p-8 text-left">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Early access
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">$0</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Workspaces, custom domains, logs, and analytics included during v1.
              </p>
              <Link href="/signup" className="mt-6 block">
                <Button className="w-full">Get started</Button>
              </Link>
              <Link
                href="/pricing"
                className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Pricing details
              </Link>
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section bordered>
          <div className="mx-auto max-w-2xl">
            <Eyebrow className="text-center">FAQ</Eyebrow>
            <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight">
              Questions
            </h2>
            <div className="mt-10 space-y-2">
              {FAQ.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </Section>

        {/* CTA */}
        <section className="relative overflow-hidden border-b border-border py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(1_0_0_/8%),transparent_60%)]"
          />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Ship the sandbox first.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Create a workspace, deploy an endpoint, share a URL. Your partners
              can integrate today.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="h-11 px-6">
                  Start building
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="h-11 px-6">
                  Documentation
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            <div>
              <BrandLogo size={28} showWordmark />
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Enterprise Integration Sandbox — mock APIs, domains, and traffic
                for teams that cannot wait on the real backend.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
              <div>
                <p className="font-medium">Product</p>
                <div className="mt-3 flex flex-col gap-2 text-muted-foreground">
                  <Link href="/features/mock-apis" className="hover:text-foreground">
                    Mock APIs
                  </Link>
                  <Link href="/features/custom-domains" className="hover:text-foreground">
                    Custom domains
                  </Link>
                  <Link href="/features/analytics" className="hover:text-foreground">
                    Analytics
                  </Link>
                  <Link href="/features/webhooks" className="hover:text-foreground">
                    Webhooks
                  </Link>
                </div>
              </div>
              <div>
                <p className="font-medium">Resources</p>
                <div className="mt-3 flex flex-col gap-2 text-muted-foreground">
                  <Link href="/docs" className="hover:text-foreground">
                    Docs
                  </Link>
                  <Link href="/pricing" className="hover:text-foreground">
                    Pricing
                  </Link>
                  <Link href="/llms.txt" className="hover:text-foreground">
                    llms.txt
                  </Link>
                </div>
              </div>
              <div>
                <p className="font-medium">Legal</p>
                <div className="mt-3 flex flex-col gap-2 text-muted-foreground">
                  <Link href="/terms" className="hover:text-foreground">
                    Terms
                  </Link>
                  <Link href="/privacy" className="hover:text-foreground">
                    Privacy
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-12 font-mono text-[11px] text-muted-foreground">
            backendruntime.com · v1
          </p>
        </footer>
      </main>
    </div>
  );
}

const FEATURES = [
  {
    href: "/features/mock-apis",
    icon: Boxes,
    title: "Mock APIs",
    body: "Methods, paths, auth, rules, and scenarios — deployed to a stable URL.",
  },
  {
    href: "/features/custom-domains",
    icon: Globe2,
    title: "Custom domains",
    body: "Serve https://your-domain/path without a workspace slug in the URL.",
  },
  {
    href: "/features/openapi",
    icon: Code2,
    title: "OpenAPI & Postman",
    body: "Import specs and collections. Keep mocks aligned with the contract.",
  },
  {
    href: "/features/analytics",
    icon: Gauge,
    title: "Analytics",
    body: "Latency, error rate, and traffic by endpoint with date-time filters.",
  },
  {
    href: "/features/webhooks",
    icon: Webhook,
    title: "Webhooks",
    body: "Inbound hooks on platform or custom domains for partner callbacks.",
  },
  {
    href: "/features/security",
    icon: Shield,
    title: "Auth & security",
    body: "Bearer, API keys, CORS, rate limits, and role-based workspace access.",
  },
];

const FAQ = [
  {
    q: "Does version bump change my endpoint URL?",
    a: "No. Revisions increment automatically on save for logging and history. Method + path stay the same.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Add a domain, verify DNS, and attach it to endpoints. Paths are served at the domain root.",
  },
  {
    q: "How is this different from a local mock server?",
    a: "Shared durable URLs, team roles, request logs, analytics, and production-shaped behavior for partners and CI.",
  },
  {
    q: "Can I sign in with Google?",
    a: "Yes on signup and login. Logged-in users can also link Google from Settings for next time.",
  },
];

function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground ${className}`}
    >
      {children}
    </p>
  );
}

function Section({
  children,
  bordered,
  id,
}: {
  children: React.ReactNode;
  bordered?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`px-4 py-20 sm:py-28 ${bordered ? "border-b border-border" : ""}`}
    >
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.div variants={fadeUp}>{children}</motion.div>
      </motion.div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-md border border-border/60 bg-background/50 px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
      >
        {q}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {a}
        </p>
      )}
    </div>
  );
}
