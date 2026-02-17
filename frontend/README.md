# Frontend — React + TypeScript + Vite

React application for uploading contract documents and displaying AI-powered benchmark analysis results. Connects to the backend API at `localhost:3001`.

## Setup

```bash
npm install
npm run dev    # starts on http://localhost:5173
```

## Features

- **Document upload** — drag-and-drop `.docx` or `.txt` files, or paste text directly
- **`.docx` parsing** — client-side extraction using mammoth.js (no server upload needed)
- **Playbook selection** — fetches available playbooks from the backend API
- **Benchmark results** — alignment score with color-coded progress bar, severity breakdown, expandable deviation cards
- **Deviation details** — document excerpt vs. standard comparison, suggested fixes, severity badges

## Source Files

| File | Responsibility |
|------|---------------|
| `src/App.tsx` | Main layout — document upload zone (drag-drop, file picker, paste), editor panel, benchmark panel, results area |
| `src/components/BenchmarkPanel.tsx` | Playbook dropdown (fetched from `/api/playbooks`), run button with loading state, disabled when no document is loaded |
| `src/components/BenchmarkResults.tsx` | Alignment score meter, severity count cards (critical/major/minor/ok), expandable deviation cards with color-coded borders |
| `src/types.ts` | TypeScript interfaces: `ClauseDeviation`, `BenchmarkResult`, `PlaybookSummary` |
| `src/index.css` | Global reset, scrollbar styling, spin animation |

## Document Upload Flow

```
User drops .docx file
  │
  ▼
mammoth.extractRawText({ arrayBuffer })  ← client-side, no server upload
  │
  ▼
Text displayed in editor panel (editable)
  │
  ▼
"Run Benchmark" sends text to POST /api/benchmark
  │
  ▼
Results rendered: score bar + deviation cards
```

For `.txt` files, `File.text()` is used directly. Text can also be pasted manually via the "Or paste text directly" option.

## Component Architecture

```
App
├── Document Panel (left)
│   ├── Upload Zone (drag-drop + file picker + paste toggle)
│   └── Text Editor (textarea, shown after upload)
├── Benchmark Panel (right top)
│   ├── Playbook Selector (fetched from API)
│   └── Run Button
└── Results Panel (right bottom)
    ├── Alignment Score (color-coded meter)
    ├── Severity Counts (critical / major / minor / ok)
    └── Deviation Cards (expandable)
        ├── Clause title + severity badge
        ├── Document excerpt vs. standard excerpt
        └── Suggested fix + "Insert Fix" button
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` | UI framework |
| `mammoth` | Client-side .docx → text extraction |
| `vite` | Dev server + bundler |
| `typescript` | Type safety |
