import { NextResponse } from "next/server";

import { APP_NAME } from "@/lib/site";

// Where this instance's backend lives. Falls back to the local dev server, so
// the spec is usable out of the box without any configuration.
const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

// The mock runtime is served from /api/{workspace}, a sibling of /api/v1.
const runtimeBase = apiBase.replace(/\/v1$/, "");

const spec = {
  openapi: "3.1.0",
  info: {
    title: APP_NAME,
    version: "1.0.0",
    description:
      "Management API under /api/v1; mock runtime under /api/{workspace} or a custom domain.",
  },
  servers: [
    { url: apiBase, description: "Management API" },
    { url: runtimeBase, description: "Mock runtime" },
  ],
  paths: {
    "/auth/register/": {
      post: {
        summary: "Register",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created with token" } },
      },
    },
    "/auth/login/": {
      post: {
        summary: "Login",
        tags: ["Auth"],
        responses: { "200": { description: "Token" } },
      },
    },
    "/auth/google/": {
      post: {
        summary: "Google sign-in",
        tags: ["Auth"],
        description:
          "Body: { id_token }. Links to existing account when email matches.",
        responses: { "200": { description: "Token" } },
      },
    },
    "/workspaces/": {
      get: { summary: "List workspaces", tags: ["Workspaces"], security: [{ TokenAuth: [] }] },
      post: { summary: "Create workspace", tags: ["Workspaces"], security: [{ TokenAuth: [] }] },
    },
    "/apis/": {
      get: { summary: "List mock endpoints", tags: ["Endpoints"], security: [{ TokenAuth: [] }] },
      post: { summary: "Create endpoint", tags: ["Endpoints"], security: [{ TokenAuth: [] }] },
    },
    "/apis/{id}/deploy/": {
      post: {
        summary: "Deploy endpoint",
        tags: ["Endpoints"],
        security: [{ TokenAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      },
    },
    "/collections/": {
      get: { summary: "List collections", tags: ["Collections"], security: [{ TokenAuth: [] }] },
      post: { summary: "Create collection", tags: ["Collections"], security: [{ TokenAuth: [] }] },
    },
    "/datasets/": {
      get: { summary: "List datasets", tags: ["Datasets"], security: [{ TokenAuth: [] }] },
    },
    "/webhooks/incoming/": {
      get: { summary: "List incoming webhooks", tags: ["Webhooks"], security: [{ TokenAuth: [] }] },
    },
  },
  components: {
    securitySchemes: {
      TokenAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "Format: Token <key>",
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
