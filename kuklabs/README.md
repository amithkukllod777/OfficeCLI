# KukDocs Engine

KukDocs Engine is the Kuklabs-owned document automation layer built on top of OfficeCLI.

## Design rule

The upstream OfficeCLI core stays as close to upstream as possible. Kuklabs-specific code, configuration, templates, APIs and integrations live under `kuklabs/` so upstream updates remain mergeable.

## Current MVP

- Fastify + TypeScript HTTP API
- Native OfficeCLI process adapter
- DOCX, XLSX and PPTX creation
- Uploaded document outline inspection
- API-key authentication
- Per-job isolated work directories
- Command timeout and disabled binary auto-update
- Non-root, read-only Docker runtime
- Pull-request CI for TypeScript and container builds

## Run locally with Docker

```bash
export KUKDOCS_API_KEY='replace-with-a-long-random-secret'
docker compose -f kuklabs/docker/docker-compose.yml up --build
```

Check health:

```bash
curl http://localhost:8080/health
```

Create a document:

```bash
curl -X POST http://localhost:8080/v1/documents \
  -H "x-api-key: $KUKDOCS_API_KEY" \
  -H 'content-type: application/json' \
  -d '{"format":"xlsx","filename":"monthly-mis.xlsx"}'
```

Inspect a document:

```bash
curl -X POST http://localhost:8080/v1/documents/inspect \
  -H "x-api-key: $KUKDOCS_API_KEY" \
  -F 'file=@sample.xlsx'
```

## Layout

```text
kuklabs/
├── api/                 # Runnable HTTP API and OfficeCLI adapter
├── contracts/           # Request/response schemas
├── integrations/        # KukBook, KukERP, KukCRM adapters
├── templates/           # Company and product templates
├── scripts/             # Local and deployment scripts
├── docker/              # Container orchestration
└── docs/                # Architecture and operating docs
```

## Safety defaults

- Source files are never overwritten.
- Each job writes to a unique output path.
- Financial and legal outputs require approval before delivery.
- Input and output retention must be configurable.
- OfficeCLI is executed without a shell to reduce command-injection risk.
- Uploaded filenames are normalized before writing to disk.

## Upstream strategy

- `main`: stable Kuklabs product branch.
- `upstream-main`: optional mirror of `iOfficeAI/OfficeCLI:main`.
- `agent/*`: implementation branches.
- Kuklabs changes stay isolated under `kuklabs/`, `.github/workflows/` and deployment files wherever possible.

## Next phase

1. Download endpoint and object-storage abstraction.
2. Persistent job database and queue.
3. KukBook MIS and financial-report adapter.
4. Template registry and approval workflow.
5. Malware scanning, retention cleanup and tenant-level quotas.
