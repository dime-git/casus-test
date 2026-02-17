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
// PLAYBOOK: A standard to compare against
// ──────────────────────────────────────────

export interface Playbook {
  id: string;
  name: string;
  description: string;
  clauses: PlaybookClause[];
}

export interface PlaybookClause {
  title: string;
  standardText: string;
  importance: "critical" | "major" | "minor";
}
