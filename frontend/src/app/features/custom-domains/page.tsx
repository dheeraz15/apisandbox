import { FeaturePage, featureMetadata } from "@/components/marketing/feature-page";

export const metadata = featureMetadata(
  "Custom domains",
  "Serve mock APIs on your verified domain without workspace slugs in the path."
);

export default function Page() {
  return (
    <FeaturePage
      eyebrow="Feature"
      title="Custom domains for partner sandboxes"
      description="Verify DNS, set a default domain, and attach endpoints. Partners hit https://your-domain/path exactly like production."
      bullets={[
        "CNAME / TXT / A verification flows",
        "Per-endpoint domain override",
        "Platform URL still available as fallback",
        "Works with inbound webhooks on the same host",
      ]}
      code={`https://sandbox.acme.com/aml/screen
https://sandbox.acme.com/hooks/partner-events`}
    />
  );
}
