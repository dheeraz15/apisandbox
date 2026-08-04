import { MarketingNav } from "@/components/marketing/nav";

export const metadata = {
  title: "Terms of Service — backendruntime",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-16 prose-legal">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 4, 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-medium text-foreground">1. Service</h2>
            <p className="mt-2">
              backendruntime provides mock API, validation, and related developer infrastructure
              (&quot;Service&quot;). By creating an account you agree to these Terms.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">2. Accounts</h2>
            <p className="mt-2">
              You are responsible for credentials and for activity under your workspaces. Google
              sign-in may be linked to an existing email/password account when emails match.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">3. Acceptable use</h2>
            <p className="mt-2">
              Do not use the Service for abuse, unlawful activity, attacking third parties, or
              circumventing rate limits / security controls. Mock endpoints are for testing,
              demos, and integration — not to impersonate production systems fraudulently.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">4. Data</h2>
            <p className="mt-2">
              You retain ownership of content you upload (specs, payloads, datasets). We process
              it to operate the Service. See the Privacy Policy for details.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">5. Availability</h2>
            <p className="mt-2">
              The Service is provided &quot;as is&quot; without warranties of uninterrupted
              availability. We may modify features with reasonable notice when practicable.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">6. Liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, backendruntime is not liable for indirect or
              consequential damages arising from use of mock or management APIs.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">7. Contact</h2>
            <p className="mt-2">Questions: use your workspace owner email or the site contact channel.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
