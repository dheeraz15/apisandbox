/**
 * The template vocabulary, in one place.
 *
 * The runtime resolver in backend/runtime/template_engine.py is the source of
 * truth for behaviour. This list is what the UI shows so people can find these
 * without reading the docs, and it should be kept in step when either changes.
 */

export type TemplateVariable = {
  /** What gets inserted into the editor. */
  token: string;
  /** Shown in the palette. */
  label: string;
  description: string;
  /** A representative rendered value, for the palette only. */
  example: string;
};

export type TemplateGroup = {
  name: string;
  blurb: string;
  variables: TemplateVariable[];
};

export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    name: "Identifiers and numbers",
    blurb: "Fresh on every call, unless the endpoint has a seed.",
    variables: [
      {
        token: "{{uuid}}",
        label: "uuid",
        description: "A random UUID v4.",
        example: "3f7c1a02-9b64-4f1e-9a77-6c2d5e0b8a41",
      },
      {
        token: "{{randomInt}}",
        label: "randomInt",
        description: "Whole number between 1 and 100000.",
        example: "48213",
      },
      {
        token: "{{randomInt:1:10}}",
        label: "randomInt with range",
        description: "Whole number inside the range you give, both ends included.",
        example: "7",
      },
      {
        token: "{{randomFloat}}",
        label: "randomFloat",
        description: "Decimal between 0 and 10000, two places.",
        example: "1088.86",
      },
      {
        token: "{{randomBool}}",
        label: "randomBool",
        description: "true or false, rendered as a real boolean.",
        example: "true",
      },
      {
        token: "{{randomFrom:pending|active|closed}}",
        label: "randomFrom",
        description: "Picks one of the values you list, separated by a pipe.",
        example: "active",
      },
    ],
  },
  {
    name: "Dates",
    blurb: "Always UTC, in ISO 8601.",
    variables: [
      {
        token: "{{timestamp}}",
        label: "timestamp",
        description: "Seconds since the Unix epoch.",
        example: "1789234221",
      },
      {
        token: "{{date}}",
        label: "date",
        description: "Right now.",
        example: "2026-09-17T04:12:00+00:00",
      },
      {
        token: "{{dateOffset:-7d}}",
        label: "dateOffset",
        description:
          "Relative to now. Use s, m, h, d or w, with a leading minus for the past.",
        example: "2026-09-10T04:12:00+00:00",
      },
    ],
  },
  {
    name: "Fake data",
    blurb:
      "Any Faker provider works, not only the ones listed. Write the method name after faker.",
    variables: [
      {
        token: "{{faker.name}}",
        label: "faker.name",
        description: "A person's full name.",
        example: "Rebecca Smith",
      },
      {
        token: "{{faker.email}}",
        label: "faker.email",
        description: "An email address.",
        example: "rsmith@example.org",
      },
      {
        token: "{{faker.phone_number}}",
        label: "faker.phone_number",
        description: "A phone number.",
        example: "+1-202-555-0148",
      },
      {
        token: "{{faker.address}}",
        label: "faker.address",
        description: "A postal address.",
        example: "884 Oak Street, Springfield",
      },
      {
        token: "{{faker.company}}",
        label: "faker.company",
        description: "A company name.",
        example: "Harper and Sons",
      },
      {
        token: "{{faker.iban}}",
        label: "faker.iban",
        description: "An IBAN.",
        example: "GB29NWBK60161331926819",
      },
      {
        token: "{{faker.sentence}}",
        label: "faker.sentence",
        description: "A short sentence of filler text.",
        example: "Quietly the river turned north.",
      },
    ],
  },
  {
    name: "From the request",
    blurb: "Echo back what the caller sent.",
    variables: [
      {
        token: "{{request.body.field}}",
        label: "request.body",
        description: "A field from the JSON body. Dots go deeper: body.user.id.",
        example: "1001234567",
      },
      {
        token: "{{request.query.page}}",
        label: "request.query",
        description: "A query string value.",
        example: "3",
      },
      {
        token: "{{request.path.id}}",
        label: "request.path",
        description:
          "A path parameter, for an endpoint declared like /users/{id}.",
        example: "42",
      },
      {
        token: "{{request.headers.X-Request-Id}}",
        label: "request.headers",
        description: "A request header.",
        example: "req_8812",
      },
      {
        token: "{{request.method}}",
        label: "request.method",
        description: "The HTTP method used.",
        example: "POST",
      },
    ],
  },
  {
    name: "Workspace",
    blurb: "Values that stay the same across the workspace.",
    variables: [
      {
        token: "{{env.VARIABLE_NAME}}",
        label: "env",
        description: "A workspace variable, managed under Variables.",
        example: "Example Bank",
      },
      {
        token: "{{workspace.slug}}",
        label: "workspace.slug",
        description: "The workspace slug.",
        example: "demo",
      },
      {
        token: "{{index}}",
        label: "index",
        description:
          "Position inside a repeat block, starting at 0. Zero outside one.",
        example: "0",
      },
    ],
  },
];

/**
 * A repeat block is structure rather than a variable, so it is offered
 * separately: it replaces a value with a generated list.
 */
export const REPEAT_SNIPPET = `{
  "$repeat": 10,
  "$item": {
    "id": "{{uuid}}",
    "index": "{{index}}",
    "name": "{{faker.name}}",
    "email": "{{faker.email}}",
    "status": "{{randomFrom:active|pending|closed}}"
  }
}`;

export const REPEAT_RANGE_SNIPPET = `{
  "$repeat": [3, 8],
  "$item": { "id": "{{uuid}}", "amount": "{{randomFloat}}" }
}`;
