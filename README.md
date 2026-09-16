# API Sandbox

A self-hosted mock API server. Define endpoints, give them realistic responses,
and call them over HTTP straight away.

Reach for it when:

- the backend does not exist yet and the frontend needs something to call
- you depend on a third-party API you cannot hit from a dev machine or from CI
- you need a dependency to fail on demand, so you can test the unhappy path
- you want a stable fixture server for integration tests

It runs entirely on your own machine or your own server. Nothing is sent
anywhere else.

## What you get

- Workspaces, so several projects can live on one instance
- Endpoints with template variables, matching rules, scenarios and stateful CRUD
- Import from OpenAPI, Postman, curl or plain JSON
- Auth modes per endpoint: none, API key, bearer, basic
- Incoming and outgoing webhooks with a live inbox
- Request logs and analytics
- A dataset studio for generating bulk fake data
- Custom domains, so mocks can answer on your own hostname

## Requirements

Docker is the quickest path. To run without it you need Python 3.11 or newer and
Node.js 20 or newer.

## Run it with Docker

```bash
git clone https://github.com/dheeraz15/apisandbox.git
cd apisandbox
docker compose up --build
```

That is the whole setup. It starts Postgres, runs migrations, seeds a demo
workspace and brings up both services:

| | |
| --- | --- |
| App | http://localhost:3000 |
| Management API | http://localhost:8000/api/v1 |
| Mock endpoints | http://localhost:8000/api/{workspace}/{path} |

Sign in with `demo@example.com` / `demo1234`, or create your own account.

Check the seeded endpoint is answering:

```bash
curl -X POST http://localhost:8000/api/demo/account/verify \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "1001234567"}'
```

An account number starting with `99` trips a rule and returns 403 instead, which
is a small demonstration of how request matching works.

## Run it without Docker

Two terminals. Backend first:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # defaults are fine for local use
python manage.py migrate
python manage.py seed_demo         # optional, creates the demo workspace
python manage.py runserver
```

The backend uses SQLite by default, so there is no database to install. Then the
frontend:

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
npm run dev
```

Open http://localhost:3000.

## Configuration

Backend settings are read from environment variables, or from `backend/.env` if
that file exists. See [backend/.env.example](backend/.env.example) for the full
list with comments. The ones that matter most:

| Variable | Default | Notes |
| --- | --- | --- |
| `SECRET_KEY` | none | Change it before exposing the instance to anyone |
| `DEBUG` | `True` | Set to `False` anywhere other than your own machine |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Required once `DEBUG=False` |
| `USE_SQLITE` | `True` | Set to `False` and fill the `POSTGRES_*` variables to use Postgres |
| `SANDBOX_BASE_URL` | `http://localhost:8000` | Public URL of the backend. Mock URLs shown in the UI are built from it |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Where the frontend runs |

The frontend reads two variables, both at build time:

| Variable | Default | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend management API |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Only used for canonical links and sitemap |

### Google sign-in is optional

Out of the box the app uses email and password, and the Google button does not
appear. To turn it on, create an OAuth client in your own Google Cloud project,
then set `GOOGLE_CLIENT_ID` on the backend and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on
the frontend to the same value.

## Writing responses

Response bodies support template variables, which are substituted per request:

| | |
| --- | --- |
| Random | `{{uuid}}`, `{{timestamp}}`, `{{randomInt}}`, `{{randomFloat}}` |
| Fake data | `{{faker.name}}`, `{{faker.email}}`, `{{faker.phone}}`, `{{faker.address}}` |
| From the request | `{{request.body.field}}`, `{{request.query.id}}`, `{{request.path.id}}` |
| From the workspace | `{{workspace.id}}`, `{{env.VARIABLE_NAME}}` |

So a response of `{"id": "{{uuid}}", "echo": "{{request.body.name}}"}` returns a
fresh id each call and echoes back what was posted.

Beyond that, **rules** let an endpoint answer differently based on the request,
**scenarios** switch a whole workspace into a different mode such as "everything
times out", and **stateful CRUD** keeps records between calls so a POST followed
by a GET behaves the way a real API would.

## Importing existing specs

You can create endpoints in bulk from something you already have:

```bash
POST /api/v1/apis/import_spec/
```

```json
{
  "format": "openapi",
  "content": { "...": "your spec" },
  "workspace": "WORKSPACE_UUID",
  "deploy": true
}
```

`format` accepts `openapi`, `swagger`, `postman`, `curl` and `json`. Add
`"preview": true` to see what would be created without saving it.

## Deploying

`docker-compose.prod.yml` builds both images, runs gunicorn instead of the dev
server and requires the settings that must not be guessed:

```bash
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(50))')"
export ALLOWED_HOSTS="api.example.com"
export CORS_ALLOWED_ORIGINS="https://app.example.com"
export CSRF_TRUSTED_ORIGINS="https://app.example.com"
export SANDBOX_BASE_URL="https://api.example.com"
export NEXT_PUBLIC_API_URL="https://api.example.com/api/v1"

docker compose -f docker-compose.prod.yml up -d --build
```

Compose refuses to start if any of those are missing, which is deliberate. It
listens on ports 8100 and 3100, so put a reverse proxy in front of it to
terminate TLS.

Two things to get right before opening it up: set `DEBUG=False`, and set a real
`SECRET_KEY`. The rate limits (`THROTTLE_ANON`, `THROTTLE_USER`, `THROTTLE_AUTH`)
and the caps on mock behaviour (`MAX_MOCK_DELAY_MS`, `MAX_REQUEST_BODY_BYTES`)
are worth reviewing too, since anyone with an account can define endpoints.

## Project layout

```
backend/
  config/       Django settings and URLs
  accounts/     Authentication
  workspaces/   Workspaces and workspace variables
  apis/         Endpoint definitions, import and export, generator
  runtime/      The mock engine that serves requests
  logs/         Request logging, analytics and webhooks

frontend/
  src/app/        Next.js routes
  src/components/ UI
  src/lib/        API client and shared config
```

## Troubleshooting

**Port already in use.** The stack wants 3000 and 8000. Change the left side of
the `ports` mapping in `docker-compose.yml` if something else has them.

**The frontend loads but every request fails.** `NEXT_PUBLIC_API_URL` is baked in
at build time, so changing it means rebuilding: `docker compose up --build`.

**CORS errors in the console.** `CORS_ALLOWED_ORIGINS` on the backend has to list
the exact origin the browser is using, scheme and port included.

**Mock URLs point at localhost in a deployed instance.** Set `SANDBOX_BASE_URL`
to the public URL of the backend.

**Starting over.** `docker compose down -v` removes the database volume too, so
the next start is a clean instance.

## Contributing

Issues and pull requests are welcome. Before opening a pull request:

```bash
cd backend && python manage.py check && python manage.py test
cd frontend && npm run lint && npm run build
```

## License

MIT. See [LICENSE](LICENSE).
