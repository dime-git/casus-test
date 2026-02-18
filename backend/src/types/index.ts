import { z } from "zod";

// ──────────────────────────────────────────
// REQUEST: What the frontend sends
// ──────────────────────────────────────────

export const BenchmarkRequestSchema = z.object({
  documentText: z.string().min(1, "Document text is required"),
  playbook: z.string().min(1, "Playbook name is required"),
});

export type BenchmarkRequest = z.infer<typeof BenchmarkRequestSchema>;

// ──────────────────────────────────────────
// LLM RESPONSE: What the AI returns (validated)
// ──────────────────────────────────────────

// Defines the structure for deviations identified by the LLM
// when comparing a document clause to the playbook standard.
// Each deviation includes a title, document and standard excerpts, deviation type, severity, explanation, 
// an optional suggested fix, and a location hint within the document.
export const ClauseDeviationSchema = z.object({
  clauseTitle: z.string(),
  documentExcerpt: z.string(),
  standardExcerpt: z.string(),
  deviationType: z.enum(["missing", "weaker", "stronger", "different", "ok"]),
  severity: z.enum(["critical", "major", "minor", "info"]),
  explanation: z.string(),
  suggestedFix: z.string().optional(),
  locationHint: z.string(),
});

export type ClauseDeviation = z.infer<typeof ClauseDeviationSchema>;

export const BenchmarkResultSchema = z.object({
  alignmentScore: z.number().min(0).max(100),
  totalClauses: z.number(),
  deviations: z.array(ClauseDeviationSchema),
  summary: z.string(),
  playbook: z.string(),
});

export type BenchmarkResult = z.infer<typeof BenchmarkResultSchema>;

// ──────────────────────────────────────────
// REVIEW: Risk analysis (no playbook needed)
// ──────────────────────────────────────────

// REVIEW: Defines schemas and types for contract risk analysis requests and responses.
// ReviewRequestSchema: Validates review requests containing contract text and (optionally) a jurisdiction.
export const ReviewRequestSchema = z.object({
  documentText: z.string().min(1, "Document text is required"),
  jurisdiction: z.string().optional(), // e.g. "Switzerland", "Germany" — helps the LLM focus
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

// - RiskFindingSchema: Describes structure of individual risk findings (category, severity, excerpt, suggestions, etc).

export const RiskFindingSchema = z.object({
  title: z.string(),
  riskCategory: z.enum([
    "liability",
    "termination",
    "intellectual_property",
    "confidentiality",
    "payment",
    "data_protection",
    "governing_law",
    "indemnification",
    "non_compete",
    "general",
  ]),
  severity: z.enum(["critical", "major", "minor", "info"]),
  documentExcerpt: z.string(),
  explanation: z.string(),
  suggestedAlternative: z.string().optional(),
  locationHint: z.string(),
});

export type RiskFinding = z.infer<typeof RiskFindingSchema>;

// Describes the summary result returned by the LLM, including overall risk, finding count, and findings list.
export const ReviewResultSchema = z.object({
  riskScore: z.number().min(0).max(100), // 0 = very risky, 100 = very safe
  totalFindings: z.number(),
  findings: z.array(RiskFindingSchema),
  summary: z.string(),
  documentType: z.string(), // LLM identifies what type of contract it is
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;

// ──────────────────────────────────────────
// PLAYBOOK: A standard to compare against
// ──────────────────────────────────────────

// Represents a playbook template used as a standard for contract benchmarking.
// Each playbook consists of an id, name, description, and an array of standard clauses.
export interface Playbook {
  id: string;                 // Unique identifier for the playbook (e.g., "nda-standard")
  name: string;               // Display name of the playbook
  description: string;        // Short description of what the playbook covers
  clauses: PlaybookClause[];  // Array of standard clauses required or recommended
}

// Represents an individual clause within a playbook.
// Each clause defines a contractual standard—with a title, the expected text, and importance.
export interface PlaybookClause {
  title: string;      // Title or heading of the clause (e.g., "Confidentiality")
  standardText: string; // The canonical or recommended text for this clause
  importance: "critical" | "major" | "minor"; // Importance for review/alignment risk
}

