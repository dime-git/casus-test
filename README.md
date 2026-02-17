# CASUS — Reverse-Engineered Architecture & Benchmark Demo

Technical interview preparation for **CASUS Technologies AG** (Zurich, Switzerland).  
Reverse-engineered from CTO interview, website, blog, and security page — Feb 2026.

---

## What is CASUS?

CASUS is a Swiss legal-tech startup that builds **AI-powered contract analysis** tools for law firms and in-house legal teams in the DACH region (Germany, Austria, Switzerland).

**Key facts:**
- Founded 2019, UZH spin-off, Zurich
- Originally built a contract automation tool (CASUS Create) — sold to LAWLIFT in 2025
- Rebuilt from scratch as an AI contract analysis platform
- Two clients: **Web App** (React) + **Word Add-in** (React + Office.js)
- Differentiator: applies changes directly in Word with **Track Changes** (redlining) — something Microsoft Copilot cannot do

## Tech Stack (Confirmed)

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript |
| Backend | Node.js + TypeScript |
| Cloud | Google Cloud Platform (Switzerland region) |
| Database | Firestore (NoSQL) |
| Auth | Firebase Authentication |
| AI Inference | Azure OpenAI (EU region) — GPT-4o / GPT-4 Turbo |
| Word Add-in | React + Office.js (Taskpane) |
| Validation | Zod (JSON schema validation for LLM output) |

**Data residency:** Storage in Switzerland (GCP), inference in EU (Azure). Zero data retention on Azure side. Microsoft abuse monitoring disabled (attorney-client privilege).

## CASUS Product Features

| Feature | Description |
|---------|-------------|
| **AI Chat** | Conversational Q&A about an open document |
| **Benchmark** | Compare contract clause-by-clause against a playbook/standard |
| **Proofread** | Find definition inconsistencies, broken cross-refs, numbering errors |
| **Review** | Identify and classify legal risks by severity |
| **Legal Research** | General legal Q&A (no document required) |
| **AI Data Room** | Bulk analysis of 10-100+ documents (M&A due diligence) |

---

## What's in This Repo

### `/backend` — Node.js + TypeScript API (Express)

A working replica of the CASUS Benchmark feature backend, demonstrating how every feature follows the same pattern:

```
Validate Input (Zod) → Fetch Playbook → Build Prompt → Call LLM → Validate Output (Zod) → Return
```

| File | Purpose |
|------|---------|
| `src/index.ts` | Express server entry point |
| `src/routes/benchmark.ts` | POST `/api/benchmark` — the core endpoint |
| `src/services/promptEngine.ts` | Builds system + user prompts per feature |
| `src/services/llm.ts` | Calls OpenAI (or returns mock data) + output validation |
| `src/services/playbooks.ts` | NDA Standard + Service Agreement playbooks |
| `src/types/index.ts` | Zod schemas for request AND LLM output validation |

**Run it:**
```bash
cd backend
npm install
npm run dev    # starts on http://localhost:3001
```

Runs in **mock mode** by default (no API key needed). Set `OPENAI_API_KEY` env var to use real OpenAI.

### `/frontend` — React + TypeScript (Vite)

A working UI that replicates the CASUS Benchmark experience:

- Left panel: paste/edit contract text
- Right panel: select playbook, run benchmark, view results
- Expandable deviation cards with severity, explanation, and "Insert Fix" button

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main layout + sample NDA document |
| `src/components/BenchmarkPanel.tsx` | Playbook selector + run button |
| `src/components/BenchmarkResults.tsx` | Alignment score, severity breakdown, deviation cards |
| `src/types.ts` | Shared TypeScript interfaces |

**Run it:**
```bash
cd frontend
npm install
npm run dev    # starts on http://localhost:5173
```

### `/officejs-example` — Office.js Reference

| File | Purpose |
|------|---------|
| `taskpane.tsx` | Complete example of a CASUS Word Add-in taskpane component |

Shows the 5 core Office.js operations CASUS uses:
1. **Read document** — `Word.run()` + `body.load("text")` + `context.sync()`
2. **Search & navigate** — find text, select it, scroll to it
3. **Replace text** — `insertText(replacement, Word.InsertLocation.replace)`
4. **Insert missing clauses** — `body.insertParagraph()` at end
5. **Highlight with Content Controls** — wrap flagged clauses with named markers

> Track Changes are **automatic** — if the lawyer has it enabled in Word, any `insertText` call creates a redline (strikethrough for deletion, underline for insertion). No special API call needed.

### `OFFICE_JS_GUIDE.md`

Crash course on Office.js for someone who knows React but has never touched Office add-ins. Covers the architecture, batch operations pattern, and all the code patterns CASUS uses.

### `INTERVIEW_PREP.md`

Preparation guide for the technical interview with Manuel (lead engineer):
- 5 most likely coding exercises with solution patterns
- Discussion questions Manuel might ask
- Key things to demonstrate during the interview

### `CasysArchitecture.html`

Interactive React component (standalone HTML) visualizing the full CASUS system architecture across 6 layers, with clickable feature data flows showing how each feature moves data through the stack.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │  Web App (React)    │  │  Word Add-in (React+Office.js)│  │
│  │  app.getcasus.com   │  │  Taskpane inside MS Word      │  │
│  └────────┬────────────┘  └────────────┬─────────────────┘  │
│           │                            │                     │
│           └──────────┬─────────────────┘                     │
│                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  BACKEND (Node.js + TypeScript) — GCP Switzerland       │ │
│  │                                                          │ │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│  │  │ API      │→ │ Prompt       │→ │ Output Validator  │  │ │
│  │  │ Routes   │  │ Engine       │  │ (Zod schemas)     │  │ │
│  │  └──────────┘  └──────┬───────┘  └──────────────────┘  │ │
│  │                       ▼                                  │ │
│  │  ┌─────────────────────────────────────────────────┐    │ │
│  │  │  Azure OpenAI (EU Region)                        │    │ │
│  │  │  GPT-4o / GPT-4 Turbo | Zero data retention     │    │ │
│  │  │  Abuse monitoring DISABLED                       │    │ │
│  │  └─────────────────────────────────────────────────┘    │ │
│  │                                                          │ │
│  │  ┌─────────────────────────────────────────────────┐    │ │
│  │  │  Firestore (NoSQL) + Cloud Storage — GCP CH      │    │ │
│  │  │  Users, documents, results, playbooks, history   │    │ │
│  │  └─────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Insights

1. **No RAG currently** — all features work with single-document context (full document sent in the LLM prompt). RAG is on the roadmap for multi-document features.

2. **Every feature follows the same backend pattern:** validate input → build prompt → call LLM → validate output → return/store.

3. **The Word Add-in talks to the same backend API** as the web app. The only difference is where the document text comes from (Office.js reads it from Word vs. the web app parses a file upload).

4. **Output validation is critical** — in legal tech, you never show unvalidated AI output to a lawyer. Every LLM response is parsed and validated against a Zod schema before returning.

5. **Data residency split** — storage in Switzerland, inference in EU. Document text crosses to Azure EU only for LLM processing, results return to Swiss GCP. Original files never leave Switzerland.
