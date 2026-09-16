export type DocSection = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  body: string;
};

export const DOC_SECTIONS: DocSection[] = [
  {
    slug: "introduction",
    title: "Introduction",
    description: "What this is and when to reach for it.",
    keywords: ["overview", "product", "mock", "validator"],
    body: `API Sandbox is a self-hosted mock API server. You define endpoints, give them realistic responses, and call them over HTTP.

Reach for it when the backend does not exist yet, when you need a third-party API you cannot hit from a dev machine, or when you need a dependency to fail on demand so you can test the unhappy path.

Use it to validate contracts, build mock APIs with business rules, bind custom domains, receive webhooks, and inspect traffic.

Core loops:
1. Create a workspace
2. Import OpenAPI / Postman / curl or describe an endpoint
3. Deploy and share a stable URL
4. Watch logs, scenarios, and webhook deliveries`,
  },
  {
    slug: "quickstart",
    title: "Quickstart",
    description: "Ship your first mock endpoint in minutes.",
    keywords: ["start", "setup", "deploy", "curl"],
    body: `1. Sign up at /signup (email or Google).
2. Create a workspace slug.
3. Open Endpoints → New endpoint (template, import, or generator).
4. Deploy.
5. Call the live URL:

Local instance:
\`POST http://localhost:8000/api/{workspace}/your-path\`

Custom domain (after DNS verify):
\`POST https://api.yourcompany.com/your-path\``,
  },
  {
    slug: "custom-domains",
    title: "Custom domains",
    description: "Serve mocks on your hostname via CNAME.",
    keywords: ["cname", "dns", "cloudflare", "domain"],
    body: `In Settings → Custom domains:

1. Add \`api.yourcompany.com\`
2. Create a CNAME pointing at the host this instance runs on, which is the value of \`CUSTOM_DOMAIN_CNAME_TARGET\` on the backend
3. Prefer Cloudflare proxy ON for HTTPS
4. Optional TXT: \`_mockapi-verify.<host>\` = token shown in UI
5. Click Verify DNS
6. Set default domain and/or pick domain per endpoint

Bound endpoints are served at \`https://your.domain/path\` without the workspace slug.`,
  },
  {
    slug: "collections",
    title: "Collections",
    description: "Group, import, and deploy related endpoints.",
    keywords: ["postman", "openapi", "import", "group"],
    body: `Collections organize endpoints by product or partner.

- Create with name, description, color
- Add existing endpoints or create new ones into the collection
- Import Postman / OpenAPI / curl / JSON
- Deploy all drafts in one click
- Remove endpoints without deleting them from the workspace`,
  },
  {
    slug: "runtime",
    title: "Mock runtime",
    description: "How requests are matched and answered.",
    keywords: ["rules", "scenarios", "auth", "rate limit", "version"],
    body: `Matching order:
- Host resolves workspace (platform path \`/api/{slug}/...\` or verified custom domain)
- Method + path pattern (\`{id}\` params supported)
- Only deployed endpoints
- Custom-domain-bound APIs only on that domain

Features: responses with \`{{variables}}\`, scenarios, rules, delays, stateful CRUD, auth types, rate limits, CORS.

Wrong HTTP method returns 405 with \`allowed_methods\`.`,
  },
  {
    slug: "generating-data",
    title: "Generating data",
    description: "Template variables, generated lists and repeatable output.",
    keywords: ["faker", "template", "variables", "repeat", "seed", "random"],
    body: `Response bodies are templates. The builder has a searchable palette of every variable, so this is a summary rather than something to memorise.

Random: \`{{uuid}}\`, \`{{randomInt}}\`, \`{{randomInt:1:10}}\`, \`{{randomFloat}}\`, \`{{randomBool}}\`
Pick one: \`{{randomFrom:pending|active|closed}}\`
Dates: \`{{timestamp}}\`, \`{{date}}\`, \`{{dateOffset:-7d}}\` (s, m, h, d, w)
Fake data: \`{{faker.name}}\`, \`{{faker.email}}\`, \`{{faker.company}}\`, and any other Faker provider
Request: \`{{request.body.field}}\`, \`{{request.query.page}}\`, \`{{request.path.id}}\`, \`{{request.headers.X-Thing}}\`
Workspace: \`{{env.KEY}}\`, \`{{workspace.slug}}\`, \`{{index}}\`

## Generated lists

Replace any value with a repeat block to return an array:

\`\`\`json
{
  "users": {
    "$repeat": 10,
    "$item": { "id": "{{uuid}}", "name": "{{faker.name}}", "index": "{{index}}" }
  }
}
\`\`\`

\`"$repeat": [3, 8]\` picks a random length in that range. Lists are capped at 1000 items.

## Repeatable output

Random data and assertions do not mix. Set a seed under Behavior and every generated value becomes deterministic, so the same request returns identical output and a snapshot test can rely on it. Leave it empty for fresh data each call.`,
  },
  {
    slug: "validating-requests",
    title: "Validating requests",
    description: "Turn a mock into a contract that rejects the wrong shape.",
    keywords: ["schema", "validation", "contract", "422", "json schema"],
    body: `By default an endpoint accepts any body. Turn on "Reject requests that do not match the body schema" under Behavior and the incoming body is validated against the endpoint's JSON Schema.

A request that does not match gets 422 and a list of what was wrong:

\`\`\`json
{
  "error": "REQUEST_VALIDATION_FAILED",
  "message": "Request body does not match the endpoint's schema.",
  "violations": [{ "field": "age", "message": "'x' is not of type 'integer'" }]
}
\`\`\`

This is what turns a mock into a contract. A caller sending the wrong shape finds out immediately rather than weeks later against the real backend.

It is off by default on purpose: an endpoint that started rejecting traffic the moment someone pasted in a schema would be a nasty surprise.

## Responses that change per call

Turn on "Cycle through responses" and each call returns the next response in the list, then wraps. That is how you mock a job that reports PENDING, PENDING, then COMPLETE.`,
  },
  {
    slug: "webhooks",
    title: "Webhooks",
    description: "Receive and fire webhooks.",
    keywords: ["inbox", "callback", "delivery"],
    body: `Incoming webhooks expose a receive URL:
\`/api/hooks/{workspace}/{slug}\`

Optionally bind a custom domain so partners POST to your hostname.

Outgoing webhooks fire after a mock response. Deliveries are listed live with export.`,
  },
  {
    slug: "observability",
    title: "Observability",
    description: "OpenTelemetry-style request inspection.",
    keywords: ["logs", "trace", "latency", "otel", "version"],
    body: `Every mock hit is logged with:
- request id / trace-style identifiers
- API name + version
- method, path, status, latency_ms
- scenario + rule finding
- request/response payloads and headers
- client IP and user agent

Use Logs for span-like drill-down and Analytics for aggregates.`,
  },
  {
    slug: "auth-api",
    title: "Management API auth",
    description: "Token and Google sign-in for the control plane.",
    keywords: ["token", "google", "login", "register"],
    body: `Control-plane auth (not mock endpoint auth):

- Email/password register + login → DRF Token
- Google ID token → \`POST /api/v1/auth/google/\`
- If Google email matches an existing account, Google is linked; both login methods work
- Send \`Authorization: Token <key>\` on management API calls`,
  },
  {
    slug: "openapi",
    title: "OpenAPI",
    description: "Machine-readable surface area.",
    keywords: ["spec", "swagger", "json"],
    body: `Download the public OpenAPI document at [/docs/openapi.json](/docs/openapi.json).

AI agents should also read [/llms.txt](/llms.txt) and [/llms-full.txt](/llms-full.txt).`,
  },
];

export function getDoc(slug: string) {
  return DOC_SECTIONS.find((s) => s.slug === slug) || DOC_SECTIONS[0];
}
