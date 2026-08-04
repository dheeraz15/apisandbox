import Link from "next/link";
import { ArrowRight, Zap, Shield, Layers, BarChart3, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/nav";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="grid-bg glow">
        <section className="mx-auto max-w-4xl px-4 pb-24 pt-24 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            Mock APIs in under 60 seconds
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl sm:leading-[1.1]">
            Build, deploy, and test
            <br />
            <span className="text-muted-foreground">any mock API.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Rules, mock data, auth, rate limits, webhooks, and request logs —
            without writing backend code. For demos, QA, sales, and integrations.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="h-11 px-6">
                Start building free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-11 px-6">
                Log in
              </Button>
            </Link>
          </div>
          <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-lg border border-border bg-card/50 p-1">
            <div className="rounded-md bg-background p-4 text-left font-mono text-xs leading-relaxed text-muted-foreground">
              <span className="text-emerald-400">POST</span>{" "}
              <span className="text-foreground">/api/your-workspace/orders</span>
              <br />
              <span className="text-muted-foreground/60">→</span>{" "}
              {"{ \"orderId\": \"{{uuid}}\", \"status\": \"shipped\" }"}
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border py-24">
          <div className="mx-auto grid max-w-5xl gap-px bg-border px-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Layers,
                title: "Collections & APIs",
                desc: "Group endpoints by product, team, or domain. Deploy instantly.",
              },
              {
                icon: Shield,
                title: "Auth & rate limits",
                desc: "API keys, bearer tokens, basic auth. Throttle per endpoint.",
              },
              {
                icon: Zap,
                title: "Smart generator",
                desc: "Describe any API in plain English. Get schema, rules, and mock data.",
              },
              {
                icon: Webhook,
                title: "Send & receive",
                desc: "Incoming webhook receivers and outgoing callbacks after responses.",
              },
              {
                icon: BarChart3,
                title: "Logs & analytics",
                desc: "Every request logged with rules matched, latency, and status.",
              },
              {
                icon: ArrowRight,
                title: "Business rules",
                desc: "Conditional responses, scenarios, delays, and stateful CRUD.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-background p-8">
                <Icon className="mb-3 h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-t border-border py-24 text-center">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              From idea to live endpoint
            </h2>
            <p className="mt-3 text-muted-foreground">
              Sign up → create workspace → generate or template → deploy → share URL
            </p>
            <Link href="/signup" className="mt-8 inline-block">
              <Button size="lg">Create your workspace</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
