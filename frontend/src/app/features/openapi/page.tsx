import { FeaturePage, featureMetadata } from "@/components/marketing/feature-page";

export const metadata = featureMetadata(
  "OpenAPI & Postman",
  "Import OpenAPI, Postman, curl, or JSON to generate mock endpoints from your contract."
);

export default function Page() {
  return (
    <FeaturePage
      eyebrow="Feature"
      title="Import the contract you already have"
      description="Bring OpenAPI specs, Postman collections, curl snippets, or JSON definitions. Generate mocks that stay close to the source of truth."
      bullets={[
        "OpenAPI / Swagger import",
        "Postman collection import",
        "curl and raw JSON paste",
        "Optional deploy-on-import",
      ]}
    />
  );
}
