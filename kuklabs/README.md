# KukDocs Engine

KukDocs Engine is the Kuklabs-owned integration layer built on top of OfficeCLI.

## Design rule

The upstream OfficeCLI core stays as close to upstream as possible. Kuklabs-specific code, configuration, templates, APIs and integrations live under `kuklabs/` so upstream updates remain mergeable.

## Initial scope

- Document generation for DOCX, XLSX and PPTX
- KukBook/KukERP export integration
- Template registry
- Job-based document processing
- Storage-provider abstraction
- Audit trail and approval hooks
- API wrapper around the OfficeCLI binary

## Planned layout

```text
kuklabs/
├── api/                 # HTTP API wrapper
├── contracts/           # Request/response schemas
├── integrations/        # KukBook, KukERP, KukCRM adapters
├── templates/           # Company and product templates
├── scripts/             # Local and deployment scripts
├── docker/              # Container assets
└── docs/                # Architecture and operating docs
```

## Safety defaults

- Source files are never overwritten.
- Each job writes to a unique output path.
- Financial and legal outputs require approval before delivery.
- Input and output retention must be configurable.
- Every command execution must be logged with redacted arguments.

## Upstream strategy

- `main`: tracks our stable product branch.
- `upstream-main`: optional mirror of `iOfficeAI/OfficeCLI:main`.
- `agent/*`: implementation branches.
- Kuklabs changes should stay isolated under `kuklabs/`, `.github/workflows/` and deployment files wherever possible.
