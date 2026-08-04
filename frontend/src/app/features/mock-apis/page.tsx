import { FeaturePage, featureMetadata } from "@/components/marketing/feature-page";

export const metadata = featureMetadata(
  "Mock APIs",
  "Deploy production-shaped mock endpoints with rules, scenarios, auth, and stable URLs."
);

export default function Page() {
  return (
    <FeaturePage
      eyebrow="Feature"
      title="Mock APIs that behave like production"
      description="Define method, path, auth, rules, and scenarios. Deploy once — revisions bump automatically without changing the URL partners call."
      bullets={[
        "HTTP methods, path params, query params, and JSON bodies",
        "Conditional rules and named scenarios",
        "Stateful or stateless responses",
        "Auto-incremented revision labels on every save",
      ]}
      code={`POST /payments/authorize
Authorization: Bearer •••
→ 200 { "status": "authorized" }`}
    />
  );
}
