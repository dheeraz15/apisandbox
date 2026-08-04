function getApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_API_URL;
  if (envBase) return envBase;

  if (typeof window !== "undefined") {
    const { origin } = window.location;
    return `${origin}/api/v1`;
  }

  return "http://localhost:8000/api/v1";
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tf_token");
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("tf_token", token);
  else localStorage.removeItem("tf_token");
}

function parseApiError(body: Record<string, unknown>): string {
  if (typeof body.detail === "string" && typeof body.error === "string") {
    return `${body.error}: ${body.detail}`;
  }
  if (typeof body.detail === "string") return body.detail;
  if (typeof body.error === "string") return body.error;
  if (Array.isArray(body.detail) && body.detail.length) {
    return String(body.detail[0]);
  }
  const fieldMessages: string[] = [];
  for (const [field, value] of Object.entries(body)) {
    if (field === "detail" || field === "error" || field === "non_field_errors") {
      if (Array.isArray(value) && value[0]) fieldMessages.push(String(value[0]));
      continue;
    }
    if (Array.isArray(value) && value.length) {
      const msg = String(value[0]);
      fieldMessages.push(
        field === "email" || field === "password" || field === "name" ? msg : `${field}: ${msg}`
      );
    } else if (typeof value === "string") {
      fieldMessages.push(value);
    }
  }
  if (fieldMessages.length) return fieldMessages[0];
  return "Request failed";
}

async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Token ${token}`;

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      "Cannot connect to API server. Ensure backend is running on port 8000."
    );
  }
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({ detail: res.statusText }))) as Record<
      string,
      unknown
    >;
    throw new Error(parseApiError(errorBody));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Unwrap DRF paginated or plain array responses */
function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as PaginatedResponse<T>).results)) {
    return (data as PaginatedResponse<T>).results;
  }
  return [];
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; name?: string }) =>
      fetchAPI<{ token: string; user: AuthUser }>("/auth/register/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      fetchAPI<{ token: string; user: AuthUser }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    logout: () =>
      fetchAPI<{ ok: boolean }>("/auth/logout/", { method: "POST" }),
    me: () => fetchAPI<AuthUser>("/auth/me/"),
    google: (idToken: string) =>
      fetchAPI<{ token: string; user: AuthUser; linked?: boolean; created?: boolean }>(
        "/auth/google/",
        {
          method: "POST",
          body: JSON.stringify({ id_token: idToken }),
        }
      ),
  },
  workspaces: {
    list: async () => unwrapList(await fetchAPI<Workspace[] | PaginatedResponse<Workspace>>("/workspaces/")),
    get: (slug: string) => fetchAPI<Workspace>(`/workspaces/${slug}/`),
    create: (data: Partial<Workspace>) =>
      fetchAPI<Workspace>("/workspaces/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (slug: string, data: Partial<Workspace>) =>
      fetchAPI<Workspace>(`/workspaces/${slug}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    domains: {
      list: (slug: string) =>
        fetchAPI<WorkspaceDomain[]>(`/workspaces/${slug}/domains/`),
      add: (slug: string, domain: string) =>
        fetchAPI<WorkspaceDomain & { setup?: DomainSetup }>(
          `/workspaces/${slug}/domains/`,
          {
            method: "POST",
            body: JSON.stringify({ domain }),
          }
        ),
      delete: (slug: string, id: string) =>
        fetchAPI<void>(`/workspaces/${slug}/domains/?id=${id}`, {
          method: "DELETE",
        }),
      verify: (slug: string, id: string) =>
        fetchAPI<WorkspaceDomain & { message?: string }>(
          `/workspaces/${slug}/domains/verify/`,
          {
            method: "POST",
            body: JSON.stringify({ id }),
          }
        ),
      setDefault: (slug: string, id: string | null) =>
        fetchAPI<{ default_domain: WorkspaceDomain | null; message: string }>(
          `/workspaces/${slug}/domains/set-default/`,
          {
            method: "POST",
            body: JSON.stringify({ id }),
          }
        ),
    },
    stats: (slug: string) => fetchAPI<WorkspaceStats>(`/workspaces/${slug}/stats/`),
    analytics: (slug: string, days = 7) =>
      fetchAPI<Analytics>(`/workspaces/${slug}/analytics/?days=${days}`),
    activity: (slug: string) => fetchAPI<RequestLog[]>(`/workspaces/${slug}/activity/`),
    variables: {
      list: (slug: string) =>
        fetchAPI<WorkspaceVariable[]>(`/workspaces/${slug}/variables/`),
      upsert: (slug: string, data: Partial<WorkspaceVariable>) =>
        fetchAPI<WorkspaceVariable>(`/workspaces/${slug}/variables/`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      delete: (slug: string, id: string) =>
        fetchAPI<void>(`/workspaces/${slug}/variables/?id=${id}`, {
          method: "DELETE",
        }),
    },
    members: {
      list: (slug: string) =>
        fetchAPI<WorkspaceMember[]>(`/workspaces/${slug}/members/`),
      invite: (slug: string, data: { email: string; role: string }) =>
        fetchAPI<WorkspaceMember | { status: string; message: string }>(
          `/workspaces/${slug}/members/`,
          { method: "POST", body: JSON.stringify(data) }
        ),
      update: (slug: string, memberId: string, role: string) =>
        fetchAPI<WorkspaceMember>(`/workspaces/${slug}/members/${memberId}/`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        }),
      remove: (slug: string, memberId: string) =>
        fetchAPI<void>(`/workspaces/${slug}/members/${memberId}/`, {
          method: "DELETE",
        }),
    },
  },
  apis: {
    list: async (workspace: string, params?: Record<string, string>) => {
      const qs = new URLSearchParams({ workspace, ...params }).toString();
      const data = await fetchAPI<PaginatedResponse<MockAPIListItem> | MockAPIListItem[]>(
        `/apis/?${qs}`
      );
      return { results: unwrapList(data), count: Array.isArray(data) ? data.length : data.count };
    },
    get: (id: string) => fetchAPI<MockAPI>(`/apis/${id}/`),
    create: (data: Partial<MockAPI>) =>
      fetchAPI<MockAPI>("/apis/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<MockAPI>) =>
      fetchAPI<MockAPI>(`/apis/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchAPI<void>(`/apis/${id}/`, { method: "DELETE" }),
    deploy: (id: string) =>
      fetchAPI<MockAPI>(`/apis/${id}/deploy/`, { method: "POST" }),
    undeploy: (id: string) =>
      fetchAPI<MockAPI>(`/apis/${id}/undeploy/`, { method: "POST" }),
    clone: (id: string) =>
      fetchAPI<MockAPI>(`/apis/${id}/clone/`, { method: "POST" }),
    test: (id: string, data: TestRequest) =>
      fetchAPI<TestResponse>(`/apis/${id}/test/`, { method: "POST", body: JSON.stringify(data) }),
    generate: (prompt: string, workspace?: string) =>
      fetchAPI<Partial<MockAPI>>("/apis/generate/", {
        method: "POST",
        body: JSON.stringify({ prompt, workspace }),
      }),
    templates: () => fetchAPI<ApiTemplate[]>("/apis/templates/"),
    fromTemplate: (template: string, workspace?: string) =>
      fetchAPI<Partial<MockAPI>>("/apis/from_template/", {
        method: "POST",
        body: JSON.stringify({ template, workspace }),
      }),
    importSpec: (data: {
      format: string;
      content: string | Record<string, unknown>;
      workspace: string;
      deploy?: boolean;
      preview?: boolean;
    }) =>
      fetchAPI<ImportResult>("/apis/import_spec/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    logs: (id: string) => fetchAPI<RequestLog[]>(`/apis/${id}/logs/`),
    stats: (id: string) => fetchAPI<ApiStats>(`/apis/${id}/stats/`),
  },
  collections: {
    list: async (workspace: string) =>
      unwrapList(
        await fetchAPI<Collection[] | PaginatedResponse<Collection>>(
          `/collections/?workspace=${workspace}`
        )
      ),
    get: (id: string) => fetchAPI<Collection>(`/collections/${id}/`),
    apis: (id: string) => fetchAPI<MockAPIListItem[]>(`/collections/${id}/apis/`),
    create: (data: Partial<Collection> & { workspace: string }) =>
      fetchAPI<Collection>("/collections/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Collection>) =>
      fetchAPI<Collection>(`/collections/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI<void>(`/collections/${id}/`, { method: "DELETE" }),
    assign: (id: string, apiIds: string[]) =>
      fetchAPI<{ assigned: number }>(`/collections/${id}/assign/`, {
        method: "POST",
        body: JSON.stringify({ api_ids: apiIds }),
      }),
    unassign: (id: string, apiIds: string[]) =>
      fetchAPI<{ unassigned: number }>(`/collections/${id}/unassign/`, {
        method: "POST",
        body: JSON.stringify({ api_ids: apiIds }),
      }),
    deployAll: (id: string) =>
      fetchAPI<{ deployed: number }>(`/collections/${id}/deploy_all/`, {
        method: "POST",
      }),
  },
  datasets: {
    list: async (workspace: string) =>
      unwrapList(
        await fetchAPI<Dataset[] | PaginatedResponse<Dataset>>(
          `/datasets/?workspace=${workspace}`
        )
      ),
    create: (data: Partial<Dataset> & { workspace: string }) =>
      fetchAPI<Dataset>("/datasets/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Dataset>) =>
      fetchAPI<Dataset>(`/datasets/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI<void>(`/datasets/${id}/`, { method: "DELETE" }),
  },
  logs: {
    list: async (workspace: string, params?: Record<string, string>) => {
      const qs = new URLSearchParams({ workspace, ...params }).toString();
      const data = await fetchAPI<PaginatedResponse<RequestLog> | RequestLog[]>(
        `/logs/?${qs}`
      );
      return {
        results: unwrapList(data),
        count: Array.isArray(data) ? data.length : data.count,
      };
    },
    get: (id: string) => fetchAPI<RequestLog>(`/logs/${id}/`),
    replay: (id: string) =>
      fetchAPI<TestResponse>(`/logs/${id}/replay/`, { method: "POST" }),
  },
  webhooks: {
    incoming: {
      list: async (workspace: string) =>
        unwrapList(
          await fetchAPI<IncomingWebhook[] | PaginatedResponse<IncomingWebhook>>(
            `/webhooks/incoming/?workspace=${workspace}`
          )
        ),
      create: (data: Partial<IncomingWebhook> & { workspace: string }) =>
        fetchAPI<IncomingWebhook>("/webhooks/incoming/", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        fetchAPI<void>(`/webhooks/incoming/${id}/`, { method: "DELETE" }),
      deliveries: (
        id: string,
        params?: { since?: string; sort?: "newest" | "oldest"; limit?: number }
      ) => {
        const qs = new URLSearchParams();
        if (params?.since) qs.set("since", params.since);
        if (params?.sort) qs.set("sort", params.sort);
        if (params?.limit) qs.set("limit", String(params.limit));
        const q = qs.toString();
        return fetchAPI<WebhookDelivery[]>(
          `/webhooks/incoming/${id}/deliveries/${q ? `?${q}` : ""}`
        );
      },
      exportDeliveries: (id: string, format: "csv" | "json" = "csv") => {
        const token = getAuthToken();
        const url = `${getApiBase()}/webhooks/incoming/${id}/deliveries/export/?format=${format}`;
        return fetch(url, {
          headers: token ? { Authorization: `Token ${token}` } : {},
        }).then(async (res) => {
          if (!res.ok) throw new Error("Export failed");
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `webhook-deliveries.${format}`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
      },
    },
    outgoing: {
      list: async (workspace: string) =>
        unwrapList(
          await fetchAPI<OutgoingWebhook[] | PaginatedResponse<OutgoingWebhook>>(
            `/webhooks/outgoing/?workspace=${workspace}`
          )
        ),
      create: (data: Partial<OutgoingWebhook> & { workspace: string }) =>
        fetchAPI<OutgoingWebhook>("/webhooks/outgoing/", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        fetchAPI<void>(`/webhooks/outgoing/${id}/`, { method: "DELETE" }),
    },
  },
};

export interface ApiStats {
  total_requests: number;
  error_rate: number;
  avg_latency_ms: number;
  by_status: { status_code: number; count: number }[];
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  date_joined?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  api_count: number;
  request_count_today?: number;
  total_requests?: number;
  member_count?: number;
  my_role?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface WorkspaceDomain {
  id: string;
  domain: string;
  verified: boolean;
  is_default: boolean;
  verification_token: string;
  verification_method?: string;
  last_verified_at?: string | null;
  cname_target: string;
  txt_name: string;
  txt_value: string;
  created_at: string;
}

export interface DomainSetup {
  cname_host: string;
  cname_target: string;
  txt_name: string;
  txt_value: string;
  instructions: string[];
}

/** Public mock API base for the platform host (not the management /api/v1). */
export function getPlatformMockBase(workspaceSlug: string): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    // In local next.dev, mocks are on :8000; in prod nginx proxies /api/
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${hostname}:8000/api/${workspaceSlug}`;
    }
    return `${protocol}//${hostname}/api/${workspaceSlug}`;
  }
  return `http://localhost:8000/api/${workspaceSlug}`;
}

export function getEndpointUrl(
  workspaceSlug: string,
  endpoint: string,
  domain?: WorkspaceDomain | null
): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (domain?.verified) return `https://${domain.domain}${path}`;
  return `${getPlatformMockBase(workspaceSlug)}${path}`;
}

export interface WorkspaceStats {
  api_count: number;
  requests_today: number;
  total_requests: number;
  active_endpoints: number;
  last_deployment: string | null;
  member_count?: number;
  collection_count?: number;
}

export interface Analytics {
  total_requests: number;
  error_rate: number;
  avg_latency_ms: number;
  by_status: { status_code: number; count: number }[];
  by_method: { method: string; count: number }[];
  by_api: {
    api_id: string;
    api__name: string;
    api__endpoint: string;
    api__method: string;
    count: number;
    avg_latency: number;
  }[];
  by_collection: {
    collection_id: string;
    collection__name: string;
    count: number;
  }[];
  by_finding: { finding: string; count: number }[];
  by_day: { day: string; count: number }[];
  by_hour: { hour: string; count: number }[];
  webhook_deliveries?: number;
  by_webhook?: { webhook_id: string; webhook__name: string; count: number }[];
}

export interface ImportResult {
  collections?: string[];
  apis?: string[];
  datasets?: string[];
  summary?: {
    collection_count?: number;
    api_count?: number;
    dataset_count?: number;
  };
  source?: string;
  error?: string;
}

export interface WorkspaceVariable {
  id: string;
  key: string;
  value: string;
  is_secret: boolean;
  description?: string;
}

export interface WorkspaceMember {
  id: string;
  user: { id: number; email: string; name: string };
  role: string;
  can_manage_members?: boolean;
  can_edit?: boolean;
  created_at: string;
}

export interface MockAPIListItem {
  id: string;
  name: string;
  method: string;
  endpoint: string;
  category: string;
  version: string;
  active_scenario: string;
  is_deployed: boolean;
  deployed_url: string;
  custom_domain: string | null;
  custom_domain_name?: string | null;
  request_count_today: number;
  last_hit_at: string | null;
  collection_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockAPI {
  id: string;
  workspace: string;
  collection: string | null;
  custom_domain: string | null;
  custom_domain_name?: string | null;
  dataset?: string | null;
  name: string;
  description: string;
  category: string;
  version: string;
  tags: string[];
  method: string;
  endpoint: string;
  auth_type: string;
  auth_config: Record<string, unknown>;
  headers: ApiField[];
  query_params: ApiField[];
  path_params: ApiField[];
  body_type: string;
  body_schema: Record<string, unknown>;
  body_example: Record<string, unknown>;
  responses: ApiResponse[];
  behavior: Record<string, unknown>;
  rules: ApiRule[];
  state_mode: string;
  state_data: Record<string, unknown>;
  active_scenario: string;
  scenarios: ApiScenario[];
  rate_limit: number | null;
  cors_enabled: boolean;
  cors_config: Record<string, unknown>;
  custom_response_headers: ApiField[];
  webhooks: unknown[];
  is_deployed: boolean;
  deployed_at: string | null;
  deployed_url: string;
  request_count_today: number;
  total_requests: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiTemplate {
  key: string;
  name: string;
  description: string;
  category: string;
  method: string;
  endpoint: string;
  icon: string;
  popular: boolean;
  blurb: string;
}

export interface ApiField {
  name: string;
  type?: string;
  required?: boolean;
  default?: string;
  description?: string;
  key?: string;
  value?: string;
}

export interface ApiResponse {
  status_code: number;
  name?: string;
  body: Record<string, unknown>;
  headers?: ApiField[];
}

export interface ApiRule {
  name: string;
  condition: RuleCondition;
  response: ApiResponse;
}

export interface RuleCondition {
  field?: string;
  operator?: string;
  value?: string;
  and?: RuleCondition[];
  or?: RuleCondition[];
}

export interface ApiScenario {
  name: string;
  label: string;
  responses?: ApiResponse[];
}

export interface Collection {
  id: string;
  workspace?: string;
  name: string;
  description: string;
  color: string;
  api_count: number;
}

export interface Dataset {
  id: string;
  workspace?: string;
  name: string;
  description: string;
  data: Record<string, unknown>;
}

export interface RequestLog {
  id: string;
  api: string | null;
  api_name: string | null;
  api_endpoint?: string | null;
  collection?: string | null;
  collection_id?: string | null;
  collection_name?: string | null;
  method: string;
  path: string;
  request_headers: Record<string, string>;
  request_body: Record<string, unknown>;
  query_params?: Record<string, string>;
  status_code: number;
  response_body: Record<string, unknown>;
  response_headers?: Record<string, string>;
  latency_ms: number;
  client_ip: string;
  scenario_used: string;
  rule_matched?: string;
  finding?: string;
  user_agent?: string;
  api_version?: string;
  request_id?: string;
  trace_id?: string;
  span_id?: string;
  domain_host?: string;
  created_at: string;
}

export interface IncomingWebhook {
  id: string;
  workspace: string;
  name: string;
  slug: string;
  description: string;
  secret: string;
  is_active: boolean;
  custom_domain?: string | null;
  hit_count: number;
  last_hit_at: string | null;
  receive_url: string;
  delivery_count?: number;
}

export interface WebhookDelivery {
  id: string;
  webhook: string;
  webhook_name: string;
  method: string;
  headers: Record<string, string>;
  query_params: Record<string, string>;
  body: Record<string, unknown>;
  raw_body: string;
  content_type: string;
  client_ip: string;
  created_at: string;
}

export interface OutgoingWebhook {
  id: string;
  workspace: string;
  api: string | null;
  api_name?: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  enabled: boolean;
}

export interface TestRequest {
  method?: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: Record<string, unknown>;
  path_params?: Record<string, string>;
}

export interface TestResponse {
  status: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
  latency_ms: number;
  scenario?: string;
  finding?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  PATCH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  HEAD: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function prettyJSON(value: unknown): string {
  try {
    if (typeof value === "string") {
      return JSON.stringify(JSON.parse(value), null, 2);
    }
    return JSON.stringify(value, null, 2);
  } catch {
    return typeof value === "string" ? value : String(value);
  }
}
