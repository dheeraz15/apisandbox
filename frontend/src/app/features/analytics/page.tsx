import { FeaturePage, featureMetadata } from "@/components/marketing/feature-page";

export const metadata = featureMetadata(
  "Analytics",
  "Latency, error rates, and traffic by endpoint with custom date-time ranges."
);

export default function Page() {
  return (
    <FeaturePage
      eyebrow="Feature"
      title="Analytics for integration traffic"
      description="See what partners and CI actually call — by day, status, collection, and endpoint. Filter with presets or exact date-time ranges."
      bullets={[
        "7 / 14 / 30 day presets",
        "Custom from–to datetime filtering",
        "Error rate and average latency",
        "Breakdowns by endpoint, collection, and findings",
      ]}
    />
  );
}
