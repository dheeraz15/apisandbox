import { MarketingNav } from "@/components/marketing/nav";

export const metadata = {
  title: "Privacy Policy — backendruntime",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 4, 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-medium text-foreground">Information we collect</h2>
            <p className="mt-2">
              Account data (name, email), authentication identifiers (including Google subject id
              when you sign in with Google), workspace configuration, API definitions, request
              logs generated when mocks are hit, and basic usage analytics.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">How we use it</h2>
            <p className="mt-2">
              To provide and secure the Service, improve reliability, debug incidents, and
              communicate product updates. We do not sell personal data.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">Google sign-in</h2>
            <p className="mt-2">
              When you use Google, we receive a verified ID token and email. If that email already
              belongs to an account, we link Google as an alternate login method.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">Retention</h2>
            <p className="mt-2">
              Account data is kept while your account is active. Request logs and webhook
              deliveries may be retained for observability and then deleted or aggregated.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">Security</h2>
            <p className="mt-2">
              We use industry-standard controls including HTTPS, token auth for the management
              API, and isolation between workspaces.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">Contact</h2>
            <p className="mt-2">Privacy requests can be sent via your account email.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
