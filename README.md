# API Sandbox

Create production-like REST APIs in minutes without writing backend code. Deploy instantly, simulate real systems, and integrate with ThirdFactor Dynamic Actions or any HTTP client.

## Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind, Shadcn UI, Monaco Editor
- **Backend:** Django, Django REST Framework, PostgreSQL
- **Runtime:** Custom mock API engine with template variables, rules, scenarios, and stateful CRUD

## Quick Start (Local)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Uses SQLite by default for local dev
echo "USE_SQLITE=True" > .env

python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and go to the **Demo Workspace**.

## Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Mock endpoints: http://localhost:8000/api/{workspace}/{endpoint}

## Demo Endpoint

After seeding, a sample Account Verification API is deployed:

```bash
curl -X POST http://localhost:8000/api/demo/account/verify \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "1001234567"}'
```

Response:

```json
{
  "customerName": "John Doe",
  "accountNumber": "1001234567",
  "status": "ACTIVE",
  "branch": "Main Branch",
  "availableBalance": "8432.17",
  "currency": "USD",
  "verified": true
}
```

Try account number starting with `99` to trigger the frozen account rule (403).

## ThirdFactor Integration

Use deployed endpoints directly in Dynamic Actions:

```
POST https://sandbox.company.com/api/demo/account/verify

Body:
{
  "accountNumber": "{{answers.account_number}}"
}
```

## Features

| Feature | Status |
|---------|--------|
| Workspace-based APIs | ✅ |
| API Builder (wizard) | ✅ |
| AI API Generator | ✅ (template-based) |
| Deploy / Undeploy | ✅ |
| Mock API Runtime | ✅ |
| Template Variables (`{{faker.name}}`, `{{uuid}}`, etc.) | ✅ |
| Conditional Rules | ✅ |
| Scenarios | ✅ |
| Request Logging | ✅ |
| Try Endpoint / Test | ✅ |
| Authentication (API Key, Bearer, Basic) | ✅ |
| Artificial Delay | ✅ |
| Stateful CRUD | ✅ |
| CORS | ✅ |
| Collections, Datasets, Import/Export | 🔜 |

## Project Structure

```
backend/
  config/          # Django settings
  workspaces/      # Workspace & variables
  apis/            # API definitions & AI generator
  runtime/         # Mock API engine & routing
  logs/            # Request logging

frontend/
  src/app/         # Next.js pages
  src/components/  # UI components
  src/lib/         # API client
```

## Template Variables

Use in response bodies:

- `{{uuid}}`, `{{timestamp}}`, `{{randomInt}}`, `{{randomFloat}}`
- `{{faker.name}}`, `{{faker.email}}`, `{{faker.phone}}`, `{{faker.address}}`
- `{{request.body.field}}`, `{{request.query.id}}`, `{{request.path.id}}`
- `{{workspace.id}}`, `{{env.VARIABLE_NAME}}`

## License

MIT
