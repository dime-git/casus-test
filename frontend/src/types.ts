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

// ──────────────────────────────────────────
// Review Types
// ──────────────────────────────────────────

export interface RiskFinding {
  title: string;
  riskCategory:
    | "liability"
    | "termination"
    | "intellectual_property"
    | "confidentiality"
    | "payment"
    | "data_protection"
    | "governing_law"
    | "indemnification"
    | "non_compete"
    | "general";
  severity: "critical" | "major" | "minor" | "info";
  documentExcerpt: string;
  explanation: string;
  suggestedAlternative?: string;
  locationHint: string;
}

export interface ReviewResult {
  riskScore: number;
  totalFindings: number;
  findings: RiskFinding[];
  summary: string;
  documentType: string;
}
