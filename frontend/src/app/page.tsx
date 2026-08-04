import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/nav";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      <main>
        {/* Hero — one composition: brand, headline, line, CTA, terminal */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(to right, oklch(1 0 0 / 4%) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 4%) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage:
                "radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-24 sm:pt-28">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              backendruntime.com
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl sm:leading-[1.05]">
              Enterprise infrastructure for reliable pre-backend mocking.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Validate contracts, build mock surfaces, and ship integrations before the
              real backend exists — with rules, auth, and production-grade traffic.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="h-11 px-5">
                  Start building
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-11 px-5">
                  Log in
                </Button>
              </Link>
            </div>

            <div className="mt-16 overflow-hidden rounded-lg border border-border bg-[#0a0a0a] shadow-[0_0_0_1px_oklch(1_0_0_/4%)]">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                  validator · live
                </span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
                <code>
                  <span className="text-emerald-400">✓</span>{" "}
                  <span className="text-foreground">POST</span> /v1/payments/authorize
                  {"\n"}
                  <span className="text-muted-foreground/50">  </span>
                  schema valid · auth bearer · rule{" "}
                  <span className="text-foreground">amount &gt; 0</span>
                  {"\n"}
                  <span className="text-muted-foreground/50">  </span>
                  latency 42ms · scenario{" "}
                  <span className="text-foreground">approved</span>
                  {"\n\n"}
                  <span className="text-amber-400">→</span>{" "}
                  {"{ \"paymentId\": \"pay_8f2a\", \"status\": \"authorized\" }"}
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* Product pillars — one job each */}
        <section id="product" className="border-b border-border">
          <div className="mx-auto grid max-w-5xl sm:grid-cols-3">
            {[
              {
                k: "01",
                title: "API validator",
                body: "Import OpenAPI, Postman, or curl. Contract checks and mock responses from the same source of truth.",
              },
              {
                k: "02",
                title: "Mock builder",
                body: "Rules, scenarios, stateful data, auth, and rate limits — deploy a stable URL your teams can hit today.",
              },
              {
                k: "03",
                title: "Runtime traffic",
                body: "Inspect every request. Webhooks in and out. Analytics that show what partners and clients actually call.",
              },
            ].map((item) => (
              <div
                key={item.k}
                className="border-b border-border px-6 py-10 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <p className="font-mono text-[11px] text-muted-foreground">{item.k}</p>
                <h2 className="mt-3 text-base font-medium tracking-tight">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-b border-border py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              From contract to live mock in minutes
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Create a workspace → import or describe an API → bind domains → share
              endpoints with QA, sales, and partner engineers.
            </p>
            <Link href="/signup" className="mt-8 inline-block">
              <Button size="lg" className="h-11">
                Create workspace
              </Button>
            </Link>
          </div>
        </section>

        <footer className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">backendruntime</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enterprise API validator & mock infrastructure
            </p>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            backendruntime.com
          </p>
        </footer>
      </main>
    </div>
  );
}
