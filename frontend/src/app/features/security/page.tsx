import { FeaturePage, featureMetadata } from "@/components/marketing/feature-page";

export const metadata = featureMetadata(
  "Auth & security",
  "Bearer, API keys, CORS, rate limits, and workspace roles for enterprise sandboxes."
);

export default function Page() {
  return (
    <FeaturePage
      eyebrow="Feature"
      title="Security controls for sandboxes"
      description="Protect mock surfaces the way you protect production APIs — without slowing down partner onboarding."
      bullets={[
        "Bearer, API key, and basic auth modes",
        "CORS configuration per endpoint",
        "Rate limiting",
        "Workspace roles: owner, manager, editor, viewer",
      ]}
    />
  );
}
