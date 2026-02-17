# AI Contract Benchmark

Full-stack application that benchmarks legal contracts against predefined clause standards using LLM analysis. Upload a contract, select a playbook (set of standard clauses), and get a clause-by-clause deviation report with severity ratings and suggested fixes.

## Architecture

```
┌──────────────────┐     ┌──────────────────────────────────────────┐
│  Frontend        │     │  Backend (Node.js + TypeScript)          │
│  React + Vite    │────▶│                                          │
│  :5173           │     │  Request ──▶ Prompt ──▶ LLM ──▶ Validate │
└──────────────────┘     │  (Zod)      Engine    (OpenAI)   (Zod)   │
                         └──────────────────────────────────────────┘
┌──────────────────┐                    │
│  Word Add-in     │────────────────────┘
│  React+Office.js │  (same API)
│  :3000 (HTTPS)   │
└──────────────────┘
```

**Every request follows the same pipeline:**

```
Validate Input (Zod) → Fetch Playbook → Build Prompt → Call LLM → Validate Output (Zod) → Return
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, TypeScript, Vite | Document upload, results UI |
| Backend | Node.js, Express 5, TypeScript | API, prompt engineering, validation |
| LLM | OpenAI API (gpt-4o-mini / gpt-4o) | Contract analysis |
| Validation | Zod | Input request + LLM output schema enforcement |
| Word Add-in | React, Office.js, Vite (HTTPS) | In-document analysis via taskpane |
| Document Parsing | mammoth.js | Client-side .docx text extraction |

## Project Structure

```
├── backend/                    # Express API server
│   └── src/
│       ├── index.ts            # Server entry, CORS, routes
│       ├── routes/
│       │   └── benchmark.ts    # POST /api/benchmark, GET /api/playbooks
│       ├── services/
│       │   ├── promptEngine.ts # Builds system + user prompts for LLM
│       │   ├── llm.ts          # OpenAI calls, retry logic, output validation
│       │   └── playbooks.ts    # Clause standards (NDA, MSA)
│       └── types/
│           └── index.ts        # Zod schemas for request & response
├── frontend/                   # React web application
│   └── src/
│       ├── App.tsx             # Document upload (drag-drop + paste) + layout
│       ├── components/
│       │   ├── BenchmarkPanel.tsx    # Playbook selector + run button
│       │   └── BenchmarkResults.tsx  # Score, deviations, suggested fixes
│       └── types.ts            # Shared TypeScript interfaces
├── word-addin/                 # Office.js Word Add-in
│   ├── manifest.xml            # Office Add-in manifest for sideloading
│   └── src/
│       ├── taskpane.html       # Entry point (loads Office.js SDK from CDN)
│       ├── main.tsx            # Office.onReady → React mount
│       ├── taskpane.tsx        # Full taskpane: read doc, benchmark, apply fixes
│       └── taskpane.css        # Taskpane styles
└── officejs-example/
    └── taskpane.tsx            # Reference Office.js patterns (standalone)
```

## Quick Start

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env            # add your OPENAI_API_KEY
npm run dev                     # http://localhost:3001

# 2. Frontend
cd frontend
npm install
npm run dev                     # http://localhost:5173

# 3. Word Add-in (optional, requires macOS + Word)
cd word-addin
npm install
npx office-addin-dev-certs install
npm run dev                     # https://localhost:3000
# Copy manifest: cp manifest.xml ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/
```

Without `OPENAI_API_KEY`, the backend returns mock data so the full UI flow is testable without any API costs.

## How It Works

### 1. Playbooks (Clause Standards)

A playbook is a set of standard clauses that define what a "proper" contract should contain. Each clause has:
- `title` — e.g. "Definition of Confidential Information"
- `standardText` — the expected language
- `importance` — critical / major / minor

Two playbooks are included: **NDA Standard** (8 clauses) and **Service Agreement MSA** (6 clauses). In production, these would be stored in a database per organization.

### 2. Prompt Engine

The prompt engine injects the playbook clauses into a structured system prompt that instructs the LLM to:
- Compare the document clause-by-clause against each standard
- Classify each as: `ok`, `missing`, `weaker`, `stronger`, or `different`
- Assign severity: `critical`, `major`, `minor`, `info`
- Quote 5-10 words from the document as a `locationHint`
- Return strict JSON matching the Zod schema

### 3. LLM Call + Retry

The LLM service includes:
- **Exponential backoff** — 3 attempts with 1s, 2s, 4s delays on rate limits / timeouts
- **Self-correction** — if Zod validation fails, the LLM is re-called with the validation errors appended to the prompt
- **Mock mode** — realistic hardcoded response for development without API costs

### 4. Output Validation

Every LLM response is validated with Zod before reaching the frontend:
- JSON parse check
- Schema validation (alignment score range, deviation types, severity levels)
- If validation fails: retry with error feedback to the LLM
- If retry also fails: return structured error to the client

### 5. Word Add-in (Office.js)

The Word Add-in uses the same backend API but reads document text directly from Word via `Office.js`:
- `Word.run()` + `body.load("text")` + `context.sync()` — read document
- `body.search()` + `select()` — navigate to flagged clauses
- `insertText(fix, Word.InsertLocation.replace)` — apply fixes (auto-creates Track Changes redlines)
- `insertContentControl()` + `font.highlightColor` — highlight deviations with severity colors
- All highlights are batched into a single `Word.run` transaction to minimize round-trips

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check, shows mock/real mode |
| GET | `/api/playbooks` | List available playbooks |
| POST | `/api/benchmark` | Run benchmark analysis |

### POST `/api/benchmark`

**Request:**
```json
{
  "documentText": "MUTUAL NON-DISCLOSURE AGREEMENT...",
  "playbook": "nda-standard"
}
```

**Response:**
```json
{
  "alignmentScore": 25,
  "totalClauses": 8,
  "playbook": "NDA Standard",
  "summary": "The contract significantly deviates from the standard...",
  "deviations": [
    {
      "clauseTitle": "Definition of Confidential Information",
      "documentExcerpt": "Confidential Information shall mean any proprietary data...",
      "standardExcerpt": "Confidential Information means any and all non-public information...",
      "deviationType": "weaker",
      "severity": "critical",
      "explanation": "The definition is too narrow...",
      "suggestedFix": "Replace with: ...",
      "locationHint": "Confidential Information shall mean any proprietary"
    }
  ]
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No | OpenAI API key. Without it, mock mode is used |
| `OPENAI_MODEL` | No | Model to use (default: `gpt-4o-mini`) |
| `PORT` | No | Backend port (default: `3001`) |
