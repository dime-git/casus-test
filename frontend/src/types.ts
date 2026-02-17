export interface ClauseDeviation {
  clauseTitle: string;
  documentExcerpt: string;
  standardExcerpt: string;
  deviationType: "missing" | "weaker" | "stronger" | "different" | "ok";
  severity: "critical" | "major" | "minor" | "info";
  explanation: string;
  suggestedFix?: string;
  locationHint: string;
}

export interface BenchmarkResult {
  alignmentScore: number;
  totalClauses: number;
  deviations: ClauseDeviation[];
  summary: string;
  playbook: string;
}

export interface PlaybookSummary {
  id: string;
  name: string;
  description: string;
  clauseCount: number;
}
