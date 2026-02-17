# Backend — Express + TypeScript API

Node.js backend that orchestrates LLM-powered contract analysis. Handles request validation, prompt construction, OpenAI API calls with retry logic, and strict output validation using Zod schemas.

## Setup

```bash
npm install
cp .env.example .env    # add OPENAI_API_KEY for real LLM calls
npm run dev              # starts on http://localhost:3001 with hot reload (tsx watch)
```

## How It Works

Every benchmark request follows this pipeline:

```
POST /api/benchmark
  │
  ▼
Validate request body (Zod) ──▶ 400 if invalid
  │
  ▼
Fetch playbook (clause standards)
  │
  ▼
Build prompt (system + user) via Prompt Engine
  │
  ▼
Call LLM (OpenAI API, with 3x retry + exponential backoff)
  │
  ▼
Validate LLM output (Zod) ──▶ retry with error feedback if invalid
  │
  ▼
Return structured JSON to client
```

## Source Files

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Express server setup — CORS, JSON body parsing, route mounting, health endpoint |
| `src/routes/benchmark.ts` | `GET /api/playbooks` and `POST /api/benchmark` endpoints, orchestrates the full pipeline |
| `src/services/promptEngine.ts` | Constructs system + user prompts — injects playbook clauses, defines output format, instructs the LLM on classification rules |
| `src/services/llm.ts` | OpenAI API integration — mock/real mode switch, retry with exponential backoff (1s/2s/4s), Zod-based output validation with LLM self-correction on failure |
| `src/services/playbooks.ts` | In-memory playbook store — NDA Standard (8 clauses), Service Agreement MSA (6 clauses) |
| `src/types/index.ts` | Zod schemas for `BenchmarkRequest` (input) and `BenchmarkResult` (LLM output), plus TypeScript interfaces for `Playbook` and `PlaybookClause` |

## Key Technical Details

### Prompt Engineering (`promptEngine.ts`)

The system prompt instructs the LLM to:
- Compare the document clause-by-clause against each playbook standard
- Classify deviations as `ok | missing | weaker | stronger | different`
- Assign severity: `critical | major | minor | info`
- Quote 5-10 words from the document as `locationHint` for UI navigation
- Return strict JSON (enforced by `response_format: { type: "json_object" }`)

### Retry & Self-Correction (`llm.ts`)

**API-level retries:** 3 attempts with exponential backoff on `RateLimitError`, `APIConnectionTimeoutError`, and `InternalServerError`.

**Validation-level retries:** If Zod validation fails (malformed JSON or schema mismatch), the LLM is re-called with the validation errors appended to the prompt:

```
"Your previous response had validation errors: deviations.0.severity: Invalid enum value.
 Fix these issues and return valid JSON matching the required schema."
```

This self-correction pattern typically resolves issues on the first retry.

### Schema Validation (`types/index.ts`)

Both input and output are validated with Zod:

- **Input:** `documentText` must be a non-empty string, `playbook` must be a non-empty string
- **Output:** `alignmentScore` must be 0-100, each deviation must have valid enum values for `deviationType` and `severity`, `suggestedFix` is optional (not needed for `ok` deviations)

TypeScript types are inferred from schemas via `z.infer<>` — single source of truth, no type/schema drift.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key. Without it, mock mode is used |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model for chat completions |
| `PORT` | `3001` | Server port |

## API Reference

### `GET /api/health`
```json
{ "status": "ok", "mock": false }
```

### `GET /api/playbooks`
```json
[
  { "id": "nda-standard", "name": "NDA Standard", "description": "...", "clauseCount": 8 },
  { "id": "service-agreement", "name": "Service Agreement (MSA)", "description": "...", "clauseCount": 6 }
]
```

### `POST /api/benchmark`
**Body:** `{ "documentText": "...", "playbook": "nda-standard" }`
**Response:** `{ "alignmentScore": 25, "totalClauses": 8, "deviations": [...], "summary": "..." }`
