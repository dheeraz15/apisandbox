import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Pricing — backendruntime",
  description: "Plans for backendruntime. Coming soon.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Pricing
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Coming soon</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          We&apos;re finalizing simple, transparent plans for teams that need enterprise mock
          infrastructure — validators, custom domains, and observability included.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/signup">
            <Button size="lg">Start free</Button>
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="outline">
              Read docs
            </Button>
          </Link>
        </div>
        <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 text-left">
          {["Hobby", "Team", "Enterprise"].map((tier) => (
            <div key={tier} className="bg-background p-6">
              <h2 className="text-sm font-medium">{tier}</h2>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-muted-foreground">
                Soon
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Details publishing shortly. Build on the free workspace today.
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
