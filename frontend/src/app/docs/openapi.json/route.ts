import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "backendruntime",
    version: "1.0.0",
    description:
      "Enterprise API validator & mock infrastructure. Management API under /api/v1; mock runtime under /api/{workspace} or custom domains.",
    contact: { url: "https://api.dhirajchapagain.com.np" },
  },
  servers: [
    { url: "https://api.dhirajchapagain.com.np/api/v1", description: "Management API" },
    { url: "https://api.dhirajchapagain.com.np/api", description: "Mock runtime (platform)" },
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
