import { FeaturePage, featureMetadata } from "@/components/marketing/feature-page";

export const metadata = featureMetadata(
  "Webhooks",
  "Receive partner callbacks on platform or custom domains with delivery logs."
);

export default function Page() {
  return (
    <FeaturePage
      eyebrow="Feature"
      title="Inbound webhooks"
      description="Expose durable hook URLs for partner events. Inspect payloads and delivery history alongside your mock APIs."
      bullets={[
        "Workspace-scoped hook slugs",
        "Optional custom domain binding",
        "Delivery history for debugging",
        "Works with the same analytics and logs stack",
      ]}
      code={`POST https://sandbox.acme.com/hooks/kyc-callback`}
    />
  );
}
